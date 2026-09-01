import { app } from '@azure/functions';
import { carregarDados, STATUS_CLIENTE } from '../shared/dados.js';
import {
  escopoDaRequisicao, oportunidadesVisiveis, tarefasVisiveis, nomeResponsavel,
} from '../shared/escopo.js';
import { ok, criado, requisicaoInvalida, naoEncontrado, erroInterno, lerCorpo, novoId , protegido } from '../shared/http.js';
import { colecaoClientes, semObjectId, mongoConfigurado } from '../shared/mongo.js';
import { validarCliente } from '../shared/validacao.js';

/**
 * As quatro operações de escrita e leitura de clientes gravam no MongoDB Atlas.
 * As demais entidades (usuários, oportunidades, interações e tarefas) seguem
 * servidas da massa mock em memória, com os mesmos ids da carga inicial.
 */

/** Acrescenta o nome do responsável e a marca de responsável inativo (RF33). */
function enriquecer(cliente) {
  const { nome, ativo } = nomeResponsavel(cliente.responsavelId);
  return { ...semObjectId(cliente), responsavelNome: nome, semResponsavelAtivo: !ativo };
}

/** Sem banco configurado, a API diz isso em vez de estourar erro de conexão. */
function bancoIndisponivel() {
  return erroInterno('MONGODB_URI não configurada: a coleção de clientes não está acessível');
}

/** Escapa o texto da busca para usá-lo como expressão regular no Mongo. */
function comoRegex(texto) {
  return new RegExp(texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

/**
 * GET /api/clientes — RF03/RF04/RF18. Pesquisa no MongoDB.
 * Busca por nome ou empresa, filtro por status e por vendedor responsável,
 * paginação de 20 registros, sempre dentro do escopo do usuário (RF15).
 */
app.http('clientes-listar', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'clientes',
  handler: protegido(async (request) => {
    if (!mongoConfigurado()) return bancoIndisponivel();
    const { usuario, ids } = escopoDaRequisicao(request);
    if (!usuario) return naoEncontrado('usuarioId não encontrado');

    const busca = (request.query.get('q') || '').trim();
    const status = request.query.get('status');
    const responsavelId = request.query.get('responsavelId');
    const porPagina = Number(request.query.get('porPagina')) || 20;

    const filtro = { responsavelId: { $in: ids }, excluido: { $ne: true } };
    if (busca) {
      const termo = comoRegex(busca);
      filtro.$or = [{ nome: termo }, { empresa: termo }];
    }
    if (status && STATUS_CLIENTE.includes(status)) filtro.status = status;
    if (responsavelId) filtro.responsavelId = responsavelId;

    const colecao = await colecaoClientes();
    const total = await colecao.countDocuments(filtro);
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
    const pagina = Math.min(Math.max(1, Number(request.query.get('pagina')) || 1), totalPaginas);

    const documentos = await colecao
      .find(filtro)
      .collation({ locale: 'pt' })
      .sort({ nome: 1 })
      .skip((pagina - 1) * porPagina)
      .limit(porPagina)
      .toArray();

    return ok({
      itens: documentos.map(enriquecer),
      paginacao: { pagina, porPagina, total, totalPaginas },
      filtros: { q: busca.toLowerCase(), status: status || 'Todos', responsavelId: responsavelId || 'Todos' },
      escopo: { usuarioId: usuario.id, perfil: usuario.perfil, responsaveis: ids },
    });
  }),
});

/**
 * GET /api/clientes/{id} — RF06/RF16.
 * O cliente vem do banco; o histórico continua vindo da massa mock.
 */
app.http('clientes-detalhe', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'clientes/{id}',
  handler: protegido(async (request) => {
    if (!mongoConfigurado()) return bancoIndisponivel();
    const { usuario, ids } = escopoDaRequisicao(request);
    if (!usuario) return naoEncontrado('usuarioId não encontrado');

    const { id } = request.params;
    const colecao = await colecaoClientes();
    const cliente = await colecao.findOne({ id });
    if (!cliente) return naoEncontrado(`Cliente ${id} não encontrado`);
    if (!ids.includes(cliente.responsavelId)) {
      return naoEncontrado(`Cliente ${id} não encontrado no escopo deste usuário`);
    }

    const dados = carregarDados();
    const oportunidades = oportunidadesVisiveis(ids).filter((o) => o.clienteId === id);
    const idsOportunidades = oportunidades.map((o) => o.id);

    return ok({
      cliente: enriquecer(cliente),
      interacoes: dados.interacoes
        .filter((i) => i.clienteId === id)
        .sort((a, b) => b.data.localeCompare(a.data)),
      oportunidades: oportunidades.sort((a, b) => b.atualizada.localeCompare(a.atualizada)),
      /* RF16 — tarefas do cliente e também as das oportunidades dele. */
      tarefas: tarefasVisiveis(ids)
        .filter((t) => t.clienteId === id || idsOportunidades.includes(t.vinculoOppId))
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    });
  }),
});

/** POST /api/clientes — RF03/RF30. Insere no MongoDB; nasce como Prospect. */
app.http('clientes-criar', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'clientes',
  handler: protegido(async (request) => {
    if (!mongoConfigurado()) return bancoIndisponivel();
    const corpo = await lerCorpo(request);
    if (!corpo) return requisicaoInvalida('Envie um corpo JSON com os dados do cliente');

    const erros = validarCliente(corpo);
    if (erros.length) return requisicaoInvalida('Cliente inválido', erros);

    const cliente = {
      id: novoId('c'),
      nome: corpo.nome.trim(),
      empresa: corpo.empresa.trim(),
      email: corpo.email.trim(),
      telefone: (corpo.telefone || '').trim(),
      status: 'Prospect',
      responsavelId: corpo.responsavelId,
      excluido: false,
    };

    const colecao = await colecaoClientes();
    await colecao.insertOne({ ...cliente });
    return criado(enriquecer(cliente));
  }),
});

/** PATCH /api/clientes/{id} — RF03. Altera no MongoDB só os campos enviados. */
app.http('clientes-atualizar', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'clientes/{id}',
  handler: protegido(async (request) => {
    if (!mongoConfigurado()) return bancoIndisponivel();
    const corpo = await lerCorpo(request);
    if (!corpo) return requisicaoInvalida('Envie um corpo JSON com os campos a alterar');

    const erros = validarCliente(corpo, { parcial: true });
    if (erros.length) return requisicaoInvalida('Alteração inválida', erros);

    const { id } = request.params;
    const alterados = { ...corpo };
    delete alterados.id;
    delete alterados._id;

    const colecao = await colecaoClientes();
    const cliente = await colecao.findOneAndUpdate(
      { id },
      { $set: alterados },
      { returnDocument: 'after' },
    );
    if (!cliente) return naoEncontrado(`Cliente ${id} não encontrado`);

    return ok(enriquecer(cliente));
  }),
});

/**
 * DELETE /api/clientes/{id} — RF03.
 * Exclusão lógica: grava `excluido: true` e status Inativo, preservando o
 * documento e todo o histórico vinculado a ele.
 */
app.http('clientes-excluir', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'clientes/{id}',
  handler: protegido(async (request) => {
    if (!mongoConfigurado()) return bancoIndisponivel();
    const { id } = request.params;

    const colecao = await colecaoClientes();
    const cliente = await colecao.findOneAndUpdate(
      { id },
      { $set: { status: 'Inativo', excluido: true } },
      { returnDocument: 'after' },
    );
    if (!cliente) return naoEncontrado(`Cliente ${id} não encontrado`);

    return ok({
      ...enriquecer(cliente),
      mensagem: 'Exclusão lógica aplicada: o cliente sai das listagens e o histórico é preservado.',
    });
  }),
});
