import { app } from '@azure/functions';
import { carregarDados, ETAPAS, STATUS_CLIENTE } from '../shared/dados.js';
import {
  escopoDaRequisicao, clientesVisiveis, oportunidadesVisiveis, tarefasVisiveis,
} from '../shared/escopo.js';
import { ok, naoEncontrado } from '../shared/http.js';

/**
 * GET /api/dashboard — RF11/RF15/RF19/RF31.
 * Indicadores do escopo do usuário: clientes por status, oportunidades por
 * etapa, valor em negociação, tarefas por faixa e ranking de vendedores.
 */
app.http('dashboard', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'dashboard',
  handler: async (request) => {
    const { usuario, ids } = escopoDaRequisicao(request);
    if (!usuario) return naoEncontrado('usuarioId não encontrado');

    const { usuarios } = carregarDados();
    const clientes = clientesVisiveis(ids);
    const oportunidades = oportunidadesVisiveis(ids);
    const tarefas = tarefasVisiveis(ids);

    const emAberto = oportunidades.filter((o) => o.etapa !== 'Fechado');
    const ganhas = oportunidades.filter((o) => o.resultado === 'ganho');
    const perdidas = oportunidades.filter((o) => o.resultado === 'perdido');

    /* RF31 — ranking por valor ganho. O Vendedor não vê ranking, então só
       Admin e Gerente recebem a lista preenchida. */
    const ranking = usuario.perfil === 'Vendedor' ? [] : ids
      .map((id) => {
        const u = usuarios.find((x) => x.id === id);
        const minhas = ganhas.filter((o) => o.responsavelId === id);
        return {
          usuarioId: id,
          nome: u ? u.nome : 'Sem responsável',
          perfil: u ? u.perfil : '—',
          ativo: u ? u.status === 'Ativo' : false,
          valorGanho: minhas.reduce((soma, o) => soma + o.valor, 0),
          oportunidadesGanhas: minhas.length,
        };
      })
      .filter((r) => r.oportunidadesGanhas > 0 || r.perfil === 'Vendedor')
      .sort((a, b) => b.valorGanho - a.valorGanho);

    return ok({
      escopo: {
        usuarioId: usuario.id,
        nome: usuario.nome,
        perfil: usuario.perfil,
        modoVisualizacao: usuario.modoVisualizacao,
        responsaveis: ids,
      },
      clientes: {
        total: clientes.length,
        porStatus: Object.fromEntries(
          STATUS_CLIENTE.map((s) => [s, clientes.filter((c) => c.status === s).length]),
        ),
      },
      oportunidades: {
        total: oportunidades.length,
        valorEmNegociacao: emAberto.reduce((soma, o) => soma + o.valor, 0),
        valorGanho: ganhas.reduce((soma, o) => soma + o.valor, 0),
        ganhas: ganhas.length,
        perdidas: perdidas.length,
        /* RF19 — contagem e soma por etapa do funil. */
        porEtapa: ETAPAS.map((etapa) => {
          const daEtapa = oportunidades.filter((o) => o.etapa === etapa);
          return {
            etapa,
            quantidade: daEtapa.length,
            valorTotal: daEtapa.reduce((soma, o) => soma + o.valor, 0),
          };
        }),
        /* RF29 — motivos da perda alimentam o relatório. */
        motivosPerda: perdidas.reduce((acc, o) => {
          if (o.motivoPerda) acc[o.motivoPerda] = (acc[o.motivoPerda] || 0) + 1;
          return acc;
        }, {}),
      },
      tarefas: {
        total: tarefas.length,
        pendentes: tarefas.filter((t) => t.status === 'pendente').length,
        concluidas: tarefas.filter((t) => t.status === 'concluida').length,
        vencidas: tarefas.filter((t) => t.faixa === 'vencida').length,
        hoje: tarefas.filter((t) => t.faixa === 'hoje').length,
        amanha: tarefas.filter((t) => t.faixa === 'amanha').length,
        proximos15Dias: tarefas.filter((t) => t.faixa === 'quinze').length,
      },
      ranking,
    });
  },
});
