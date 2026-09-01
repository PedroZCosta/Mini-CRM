/**
 * Funções puras que aplicam as alterações locais sobre o que a API devolveu.
 * Ficam separadas do provider para poderem ser usadas em qualquer tela.
 */
import type { Alteracoes } from './contexto';
import type { EtapaFunil, Interacao, Oportunidade, Tarefa } from '../tipos';

export function mesclarInteracoes(itens: Interacao[], a: Alteracoes, clienteId: string) {
  const novas = a.interacoesNovas.filter((i) => i.clienteId === clienteId);
  return [...novas, ...itens].sort((x, y) => y.data.localeCompare(x.data));
}

export function mesclarOportunidades(itens: Oportunidade[], a: Alteracoes, clienteId?: string) {
  const aplicadas = itens.map((o) =>
    a.oportunidadesAlteradas[o.id] ? { ...o, ...a.oportunidadesAlteradas[o.id] } : o);
  const novas = clienteId
    ? a.oportunidadesNovas.filter((o) => o.clienteId === clienteId)
    : a.oportunidadesNovas;
  return [...novas, ...aplicadas];
}

/** Recalcula as colunas do funil depois de mover cards, para os totais do RF19 baterem. */
export function mesclarFunil(etapas: EtapaFunil[], a: Alteracoes, responsaveisVisiveis: string[]) {
  const todas = mesclarOportunidades(etapas.flatMap((e) => e.itens), a)
    .filter((o) => responsaveisVisiveis.includes(o.responsavelId));

  const recalculadas = etapas.map((coluna) => {
    const itens = todas.filter((o) => o.etapa === coluna.etapa).sort((x, y) => y.valor - x.valor);
    return {
      ...coluna,
      itens,
      quantidade: itens.length,
      valorTotal: itens.reduce((soma, o) => soma + o.valor, 0),
      ganhas: itens.filter((o) => o.resultado === 'ganho').length,
      perdidas: itens.filter((o) => o.resultado === 'perdido').length,
    };
  });

  const valorEmNegociacao = recalculadas
    .filter((e) => e.etapa !== 'Fechado')
    .reduce((soma, e) => soma + e.valorTotal, 0);

  return { etapas: recalculadas, valorEmNegociacao, total: todas.length };
}

export function mesclarTarefas(itens: Tarefa[], a: Alteracoes) {
  return itens.map((t) => {
    const mudancas = a.tarefasAlteradas[t.id];
    if (!mudancas) return t;
    const tarefa = { ...t, ...mudancas };
    /* RF28 — tarefa concluída não carrega faixa de vencimento. */
    return tarefa.status === 'concluida' ? { ...tarefa, faixa: null } : tarefa;
  });
}
