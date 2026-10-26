export const ICONES = { 'Ligação': 'phone', 'E-mail': 'mail', 'Reunião': 'meeting' };
export const CORES = { 'Ligação': 'signal', 'E-mail': 'violet', 'Reunião': 'amber' };

/** RF05 — registra ligação, e-mail ou reunião com data e observação. */
export function criarInteracao({ clienteId, tipo, obs, data, autorId }, responsavelDoCliente, gerarId) {
  const tipoLimpo = tipo.trim();
  return {
    id: gerarId('i'),
    clienteId,
    tipo: tipoLimpo,
    icon: ICONES[tipoLimpo],
    cor: CORES[tipoLimpo],
    obs: obs.trim(),
    data: data || new Date().toISOString().slice(0, 10),
    autorId: autorId || responsavelDoCliente || null,
  };
}
