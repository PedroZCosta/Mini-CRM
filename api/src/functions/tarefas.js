import { app } from '@azure/functions';
import { carregarDados } from '../shared/dados.js';
import { escopoDaRequisicao, tarefasVisiveis } from '../shared/escopo.js';
import { ok, requisicaoInvalida, naoEncontrado, lerCorpo } from '../shared/http.js';
import { validarTarefa } from '../shared/validacao.js';

/**
 * GET /api/tarefas — RF10/RF13.
 * Tarefas do escopo do usuário, já classificadas nas faixas de vencimento
 * (vencida, hoje, amanhã, próximos 15 dias) usadas pelos avisos da tela inicial.
 */
app.http('tarefas-listar', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tarefas',
  handler: async (request) => {
    const { usuario, ids } = escopoDaRequisicao(request);
    if (!usuario) return naoEncontrado('usuarioId não encontrado');

    const status = request.query.get('status');
    let lista = tarefasVisiveis(ids);
    if (status) lista = lista.filter((t) => t.status === status);

    const clientesPorId = new Map(carregarDados().clientes.map((c) => [c.id, c]));
    lista = lista
      .map((t) => ({ ...t, clienteNome: clientesPorId.get(t.clienteId)?.nome || '—' }))
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

    const porFaixa = (faixa) => lista.filter((t) => t.faixa === faixa).length;
    return ok({
      itens: lista,
      total: lista.length,
      resumo: {
        pendentes: lista.filter((t) => t.status === 'pendente').length,
        concluidas: lista.filter((t) => t.status === 'concluida').length,
        vencidas: porFaixa('vencida'),
        hoje: porFaixa('hoje'),
        amanha: porFaixa('amanha'),
        proximos15Dias: porFaixa('quinze'),
      },
    });
  },
});

/** PATCH /api/tarefas/{id} — RF28. Marca a tarefa como concluída ou reabre. */
app.http('tarefas-atualizar', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'tarefas/{id}',
  handler: async (request) => {
    const corpo = await lerCorpo(request);
    if (!corpo) return requisicaoInvalida('Envie um corpo JSON com os campos a alterar');

    const erros = validarTarefa(corpo);
    if (erros.length) return requisicaoInvalida('Alteração inválida', erros);

    const { id } = request.params;
    const atual = carregarDados().tarefas.find((t) => t.id === id) || { id };
    const tarefa = { ...atual, ...corpo, id };

    /* RF28 — "vencida" é sempre derivado da data, nunca gravado. */
    if (tarefa.status === 'concluida') tarefa.faixa = null;

    return ok(tarefa);
  },
});
