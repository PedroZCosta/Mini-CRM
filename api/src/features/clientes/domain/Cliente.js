export const STATUS_CLIENTE = ['Prospect', 'Ativo', 'Inativo'];

/** RF33 — acrescenta o nome do responsável e a marca de responsável inativo. */
export function enriquecerComResponsavel(cliente, { nome, ativo }) {
  return { ...cliente, responsavelNome: nome, semResponsavelAtivo: !ativo };
}

/** RF03 — exclusão lógica: vira Inativo e some das listagens. */
export function aplicarExclusaoLogica(cliente) {
  return { ...cliente, status: 'Inativo', excluido: true };
}

/** RF03/RF30 — todo cliente novo nasce como Prospect. */
export function criarClienteProspect({ nome, empresa, email, telefone, responsavelId }, gerarId) {
  return {
    id: gerarId('c'),
    nome: nome.trim(),
    empresa: empresa.trim(),
    email: email.trim(),
    telefone: (telefone || '').trim(),
    status: 'Prospect',
    responsavelId,
    excluido: false,
  };
}
