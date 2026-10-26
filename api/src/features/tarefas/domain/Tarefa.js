/** RF28 — "vencida" é sempre derivado da data, nunca gravado. */
export function marcarAlteracoes(atual, corpo, id) {
  const tarefa = { ...atual, ...corpo, id };
  if (tarefa.status === 'concluida') tarefa.faixa = null;
  return tarefa;
}
