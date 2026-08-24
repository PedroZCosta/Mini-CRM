import { app } from '@azure/functions';
import { carregarDados, STATUS_CLIENTE } from '../shared/dados.js';
import {
  escopoDaRequisicao, clientesVisiveis, oportunidadesVisiveis,
  tarefasVisiveis, nomeResponsavel,
} from '../shared/escopo.js';
import { ok, criado, requisicaoInvalida, naoEncontrado, lerCorpo, paginar, novoId } from '../shared/http.js';
import { validarCliente } from '../shared/validacao.js';

/** Acrescenta o nome do responsável e a marca de responsável inativo (RF33). */
function enriquecer(cliente) {
  const { nome, ativo } = nomeResponsavel(cliente.responsavelId);
  return { ...cliente, responsavelNome: nome, semResponsavelAtivo: !ativo };
}

/**
 * GET /api/clientes — RF03/RF04/RF18.
 * Busca por nome ou empresa, filtro por status e por vendedor responsável,
 * paginação de 20 registros. O resultado respeita o escopo do usuário (RF15).
 */
app.http('clientes-listar', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'clientes',
  handler: async (request) => {
    const { usuario, ids } = escopoDaRequisicao(request);
    if (!usuario) return naoEncontrado('usuarioId não encontrado');

    const busca = (request.query.get('q') || '').trim().toLowerCase();
    const status = request.query.get('status');
    const responsavelId = request.query.get('responsavelId');
    const pagina = request.query.get('pagina');
    const porPagina = Number(request.query.get('porPagina')) || 20;

    let lista = clientesVisiveis(ids);
    if (busca) {
      lista = lista.filter((c) => c.nome.toLowerCase().includes(busca)
        || c.empresa.toLowerCase().includes(busca));
    }
    if (status && STATUS_CLIENTE.includes(status)) lista = lista.filter((c) => c.status === status);
    if (responsavelId) lista = lista.filter((c) => c.responsavelId === responsavelId);

    lista = lista.map(enriquecer).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const { itens, paginacao } = paginar(lista, pagina, porPagina);

    return ok({
      itens,
      paginacao,
      filtros: { q: busca, status: status || 'Todos', responsavelId: responsavelId || 'Todos' },
      escopo: { usuarioId: usuario.id, perfil: usuario.perfil, responsaveis: ids },
    });
  },
});

/**
 * GET /api/clientes/{id} — RF06/RF16.
 * Detalhe com histórico de interações, oportunidades e tarefas vinculadas.
 */
app.http('clientes-detalhe', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'clientes/{id}',
  handler: async (request) => {
    const { usuario, ids } = escopoDaRequisicao(request);
    if (!usuario) return naoEncontrado('usuarioId não encontrado');

    const { id } = request.params;
    const dados = carregarDados();
    const cliente = dados.clientes.find((c) => c.id === id);
    if (!cliente) return naoEncontrado(`Cliente ${id} não encontrado`);
    if (!ids.includes(cliente.responsavelId)) {
      return naoEncontrado(`Cliente ${id} não encontrado no escopo deste usuário`);
    }

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
  },
});

/** POST /api/clientes — RF03/RF30. Cliente nasce como Prospect. */
app.http('clientes-criar', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'clientes',
  handler: async (request) => {
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
    return criado(enriquecer(cliente));
  },
});

/** PATCH /api/clientes/{id} — RF03. Edição parcial: só os campos enviados. */
app.http('clientes-atualizar', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'clientes/{id}',
  handler: async (request) => {
    const corpo = await lerCorpo(request);
    if (!corpo) return requisicaoInvalida('Envie um corpo JSON com os campos a alterar');

    const erros = validarCliente(corpo, { parcial: true });
    if (erros.length) return requisicaoInvalida('Alteração inválida', erros);

    const { id } = request.params;
    const atual = carregarDados().clientes.find((c) => c.id === id) || { id };
    const alterados = { ...corpo };
    delete alterados.id;

    return ok(enriquecer({ ...atual, ...alterados }));
  },
});

/**
 * DELETE /api/clientes/{id} — RF03.
 * Exclusão lógica: o cliente vira Inativo e sai das listagens, o histórico fica.
 */
app.http('clientes-excluir', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'clientes/{id}',
  handler: async (request) => {
    const { id } = request.params;
    const atual = carregarDados().clientes.find((c) => c.id === id);
    if (!atual) return naoEncontrado(`Cliente ${id} não encontrado`);

    return ok({
      ...enriquecer({ ...atual, status: 'Inativo', excluido: true }),
      mensagem: 'Exclusão lógica aplicada: o cliente sai das listagens e o histórico é preservado.',
    });
  },
});
