/** RF31 — ranking por valor ganho. O Vendedor não vê ranking. */
export function calcularRanking(usuario, ids, usuarios, ganhas, perdidas) {
  if (usuario.perfil === 'Vendedor') return [];
  return ids
    .map((id) => {
      const u = usuarios.find((x) => x.id === id);
      const minhas = ganhas.filter((o) => o.responsavelId === id);
      const minhasPerdidas = perdidas.filter((o) => o.responsavelId === id);
      return {
        usuarioId: id,
        nome: u ? u.nome : 'Sem responsável',
        perfil: u ? u.perfil : '—',
        ativo: u ? u.status === 'Ativo' : false,
        valorGanho: minhas.reduce((soma, o) => soma + o.valor, 0),
        oportunidadesGanhas: minhas.length,
        oportunidadesPerdidas: minhasPerdidas.length,
      };
    })
    .filter((r) => r.oportunidadesGanhas > 0 || r.perfil === 'Vendedor')
    .sort((a, b) => b.valorGanho - a.valorGanho);
}

/** RF19/RF29 — contagem e soma do funil por etapa, mais motivos de perda. */
export function calcularIndicadoresOportunidades(oportunidades, etapas) {
  const emAberto = oportunidades.filter((o) => o.etapa !== 'Fechado');
  const ganhas = oportunidades.filter((o) => o.resultado === 'ganho');
  const perdidas = oportunidades.filter((o) => o.resultado === 'perdido');
  return {
    total: oportunidades.length,
    valorEmNegociacao: emAberto.reduce((soma, o) => soma + o.valor, 0),
    valorGanho: ganhas.reduce((soma, o) => soma + o.valor, 0),
    ganhas: ganhas.length,
    perdidas: perdidas.length,
    porEtapa: etapas.map((etapa) => {
      const daEtapa = oportunidades.filter((o) => o.etapa === etapa);
      return {
        etapa,
        quantidade: daEtapa.length,
        valorTotal: daEtapa.reduce((soma, o) => soma + o.valor, 0),
      };
    }),
    motivosPerda: perdidas.reduce((acc, o) => {
      if (o.motivoPerda) acc[o.motivoPerda] = (acc[o.motivoPerda] || 0) + 1;
      return acc;
    }, {}),
  };
}

export function calcularIndicadoresTarefas(tarefas) {
  return {
    total: tarefas.length,
    pendentes: tarefas.filter((t) => t.status === 'pendente').length,
    concluidas: tarefas.filter((t) => t.status === 'concluida').length,
    vencidas: tarefas.filter((t) => t.faixa === 'vencida').length,
    hoje: tarefas.filter((t) => t.faixa === 'hoje').length,
    amanha: tarefas.filter((t) => t.faixa === 'amanha').length,
    proximos15Dias: tarefas.filter((t) => t.faixa === 'quinze').length,
  };
}

export function calcularIndicadoresClientes(clientes, statusPossiveis) {
  return {
    total: clientes.length,
    porStatus: Object.fromEntries(statusPossiveis.map((s) => [s, clientes.filter((c) => c.status === s).length])),
  };
}
