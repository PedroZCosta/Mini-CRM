import { app } from '@azure/functions';
import { carregarDados, ETAPAS } from '../shared/dados.js';
import { escopoDaRequisicao, oportunidadesVisiveis, nomeResponsavel } from '../shared/escopo.js';
import { ok, criado, requisicaoInvalida, naoEncontrado, lerCorpo, novoId } from '../shared/http.js';
import { validarOportunidade, validarMovimentacao } from '../shared/validacao.js';

function enriquecer(opp, clientesPorId) {
  const cliente = clientesPorId.get(opp.clienteId);
  const { nome, ativo } = nomeResponsavel(opp.responsavelId);
  return {
    ...opp,
    clienteNome: cliente ? cliente.nome : 'Cliente removido',
    clienteEmpresa: cliente ? cliente.empresa : '—',
    responsavelNome: nome,
    semResponsavelAtivo: !ativo,
  };
}

/**
 * GET /api/oportunidades — RF08/RF19.
 * Devolve as oportunidades agrupadas nas quatro etapas do funil, com contagem
 * e soma dos valores estimados por etapa.
 */
app.http('oportunidades-listar', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'oportunidades',
  handler: async (request) => {
    const { usuario, ids } = escopoDaRequisicao(request);
    if (!usuario) return naoEncontrado('usuarioId não encontrado');

    const dados = carregarDados();
    const clientesPorId = new Map(dados.clientes.map((c) => [c.id, c]));
    const filtroEtapa = request.query.get('etapa');

    let lista = oportunidadesVisiveis(ids).map((o) => enriquecer(o, clientesPorId));
    if (filtroEtapa && ETAPAS.includes(filtroEtapa)) {
      lista = lista.filter((o) => o.etapa === filtroEtapa);
    }

    /* RF19 — cada etapa carrega a própria contagem e a soma dos valores. */
    const etapas = ETAPAS.map((etapa) => {
      const itens = lista
        .filter((o) => o.etapa === etapa)
        .sort((a, b) => b.valor - a.valor);
      return {
        etapa,
        quantidade: itens.length,
        valorTotal: itens.reduce((soma, o) => soma + o.valor, 0),
        ganhas: itens.filter((o) => o.resultado === 'ganho').length,
        perdidas: itens.filter((o) => o.resultado === 'perdido').length,
        itens,
      };
    });

    const emAberto = lista.filter((o) => o.etapa !== 'Fechado');
    return ok({
      etapas,
      total: lista.length,
      valorEmNegociacao: emAberto.reduce((soma, o) => soma + o.valor, 0),
      escopo: { usuarioId: usuario.id, perfil: usuario.perfil },
    });
  },
});

/** POST /api/oportunidades — RF07. Nasce em Prospecção, salvo etapa informada. */
app.http('oportunidades-criar', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'oportunidades',
  handler: async (request) => {
    const corpo = await lerCorpo(request);
    if (!corpo) return requisicaoInvalida('Envie um corpo JSON com os dados da oportunidade');

    const erros = validarOportunidade(corpo);
    if (erros.length) return requisicaoInvalida('Oportunidade inválida', erros);

    const dados = carregarDados();
    /* Pode ser um cliente cadastrado nesta sessão, que a API não conhece. */
    const cliente = dados.clientes.find((c) => c.id === corpo.clienteId) || null;
    const hoje = new Date().toISOString().slice(0, 10);

    const oportunidade = {
      id: novoId('o'),
      clienteId: corpo.clienteId,
      titulo: corpo.titulo.trim(),
      etapa: corpo.etapa || 'Prospecção',
      resultado: null,
      motivoPerda: null,
      valor: Number(corpo.valor),
      dataPrevista: corpo.dataPrevista || hoje,
      atualizada: hoje,
      responsavelId: corpo.responsavelId || cliente?.responsavelId || null,
    };
    const indice = cliente ? new Map([[cliente.id, cliente]]) : new Map();
    return criado(enriquecer(oportunidade, indice));
  },
});

/**
 * PATCH /api/oportunidades/{id} — RF09/RF29/RF30.
 * Move a oportunidade no funil. Fechar como perdido exige motivo; sair de
 * Fechado exige reabertura explícita. Ganhar promove o cliente a Ativo.
 */
app.http('oportunidades-mover', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'oportunidades/{id}',
  handler: async (request) => {
    const corpo = await lerCorpo(request);
    if (!corpo) return requisicaoInvalida('Envie um corpo JSON com a etapa de destino');

    const { id } = request.params;
    const dados = carregarDados();
    const atual = dados.oportunidades.find((o) => o.id === id) || null;

    const erros = validarMovimentacao(corpo, atual);
    if (erros.length) return requisicaoInvalida('Movimentação inválida', erros);

    const fechando = corpo.etapa === 'Fechado';
    const oportunidade = {
      ...(atual || { id }),
      etapa: corpo.etapa,
      resultado: fechando ? corpo.resultado : null,
      motivoPerda: fechando && corpo.resultado === 'perdido' ? corpo.motivoPerda : null,
      atualizada: new Date().toISOString().slice(0, 10),
    };

    const clientesPorId = new Map(dados.clientes.map((c) => [c.id, c]));
    /* RF30 — a primeira oportunidade ganha promove o cliente a Ativo. */
    const promoveCliente = fechando && corpo.resultado === 'ganho';

    return ok({
      oportunidade: enriquecer(oportunidade, clientesPorId),
      clienteStatus: promoveCliente ? 'Ativo' : null,
      reaberta: Boolean(atual && atual.etapa === 'Fechado' && !fechando),
    });
  },
});
