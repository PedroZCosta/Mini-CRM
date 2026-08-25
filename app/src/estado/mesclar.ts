/**
 * Funções puras que aplicam as alterações locais sobre o que a API devolveu.
 * Ficam separadas do provider para poderem ser usadas em qualquer tela.
 */
import type { Alteracoes } from './contexto';
import type { Cliente, EtapaFunil, Interacao, Oportunidade, Tarefa } from '../tipos';

interface FiltroClientes {
  q: string;
  status: string;
  responsavelId: string;
  responsaveisVisiveis: string[];
}

/** Um cliente criado nesta sessão só entra na lista se casar com os filtros ativos. */
function casaComFiltro(cliente: Cliente, f: FiltroClientes) {
  if (!f.responsaveisVisiveis.includes(cliente.responsavelId)) return false;
  if (f.status !== 'Todos' && cliente.status !== f.status) return false;
  if (f.responsavelId !== 'Todos' && cliente.responsavelId !== f.responsavelId) return false;
  if (f.q) {
    const termo = f.q.toLowerCase();
    if (!cliente.nome.toLowerCase().includes(termo) && !cliente.empresa.toLowerCase().includes(termo)) {
      return false;
    }
  }
  return true;
}

export function mesclarClientes(itens: Cliente[], a: Alteracoes, filtro: FiltroClientes) {
  const aplicados = itens
    .filter((c) => !a.clientesExcluidos.includes(c.id))
    .map((c) => (a.clientesAlterados[c.id] ? { ...c, ...a.clientesAlterados[c.id] } : c));

  /* Os criados agora aparecem no topo, como retorno visual imediato do cadastro. */
  const novos = a.clientesNovos.filter((c) => casaComFiltro(c, filtro));
  return { itens: [...novos, ...aplicados], novosVisiveis: novos.length };
}

export function mesclarCliente(cliente: Cliente, a: Alteracoes): Cliente {
  const novo = a.clientesNovos.find((c) => c.id === cliente.id);
  if (novo) return novo;
  return a.clientesAlterados[cliente.id] ? { ...cliente, ...a.clientesAlterados[cliente.id] } : cliente;
}

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
