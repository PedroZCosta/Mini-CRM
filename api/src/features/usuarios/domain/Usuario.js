/** Regra de negócio: decide se um usuário atende ao filtro pedido. */
export function atendeFiltro(usuario, { perfil, apenasAtivos }) {
  if (perfil && usuario.perfil !== perfil) return false;
  if (apenasAtivos && usuario.status !== 'Ativo') return false;
  return true;
}
