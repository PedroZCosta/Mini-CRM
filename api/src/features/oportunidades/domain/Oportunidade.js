export const ETAPAS = ['Prospecção', 'Contato', 'Proposta', 'Fechado'];

export function enriquecerComCliente(oportunidade, cliente, responsavel) {
  return {
    ...oportunidade,
    clienteNome: cliente ? cliente.nome : 'Cliente removido',
    clienteEmpresa: cliente ? cliente.empresa : '—',
    responsavelNome: responsavel.nome,
    semResponsavelAtivo: !responsavel.ativo,
  };
}

/** RF07 — nasce em Prospecção, salvo etapa informada. */
export function criarOportunidadeProspeccao({ clienteId, titulo, etapa, valor, dataPrevista, responsavelId }, clienteEncontrado, gerarId) {
  const hoje = new Date().toISOString().slice(0, 10);
  return {
    id: gerarId('o'),
    clienteId,
    titulo: titulo.trim(),
    etapa: etapa || 'Prospecção',
    resultado: null,
    motivoPerda: null,
    valor: Number(valor),
    dataPrevista: dataPrevista || hoje,
    atualizada: hoje,
    responsavelId: responsavelId || clienteEncontrado?.responsavelId || null,
  };
}

/** RF09/RF29 — aplica a movimentação de etapa, resolvendo resultado e motivo. */
export function moverEtapa(atual, corpo) {
  const fechando = corpo.etapa === 'Fechado';
  return {
    ...(atual || { id: corpo.id }),
    etapa: corpo.etapa,
    resultado: fechando ? corpo.resultado : null,
    motivoPerda: fechando && corpo.resultado === 'perdido' ? corpo.motivoPerda : null,
    atualizada: new Date().toISOString().slice(0, 10),
  };
}

/** RF30 — a primeira oportunidade ganha promove o cliente a Ativo. */
export function promoveClienteParaAtivo(corpo) {
  return corpo.etapa === 'Fechado' && corpo.resultado === 'ganho';
}

/** RF09 — sair de Fechado sem reabrir explicitamente é bloqueado na validação. */
export function foiReaberta(atual, corpo) {
  return Boolean(atual && atual.etapa === 'Fechado' && corpo.etapa !== 'Fechado');
}
