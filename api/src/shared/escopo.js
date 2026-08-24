/**
 * RF02/RF15/RF26 — define o que cada usuário enxerga.
 *
 * Vendedor vê apenas a própria carteira; Gerente vê a si e aos vendedores que
 * cadastrou; Administrador em modo Total vê todos. Toda listagem da API passa
 * por aqui, então uma rota nunca devolve dado fora do escopo do usuário.
 */
import { carregarDados } from './dados.js';

export function usuarioPorId(id) {
  return carregarDados().usuarios.find((u) => u.id === id) || null;
}

/** Ids dos responsáveis visíveis para o usuário informado. */
export function idsVisiveis(usuario) {
  const { usuarios } = carregarDados();
  if (!usuario) return [];
  const modo = usuario.modoVisualizacao
    || (usuario.perfil === 'Admin' ? 'Total' : usuario.perfil === 'Gerente' ? 'Equipe' : 'Individual');

  if (usuario.perfil === 'Vendedor' || modo === 'Individual') return [usuario.id];
  if (usuario.perfil === 'Admin' && modo === 'Total') return usuarios.map((u) => u.id);
  return [usuario.id, ...usuarios.filter((u) => u.gerenteId === usuario.id).map((u) => u.id)];
}

/**
 * Resolve o usuário do parâmetro `usuarioId`.
 * Sem parâmetro, assume o Administrador do seed: facilita testar a API no
 * navegador ou no Postman sem montar a query inteira.
 */
export function escopoDaRequisicao(request) {
  const id = request.query.get('usuarioId');
  if (!id) {
    const admin = carregarDados().usuarios.find((u) => u.perfil === 'Admin');
    return { usuario: admin, ids: idsVisiveis(admin), padrao: true };
  }
  const usuario = usuarioPorId(id);
  if (!usuario) return { usuario: null, ids: [], padrao: false };
  return { usuario, ids: idsVisiveis(usuario), padrao: false };
}

/** RF03 — clientes excluídos logicamente saem das listagens, mas seguem no banco. */
export function clientesVisiveis(ids, { incluirExcluidos = false } = {}) {
  return carregarDados().clientes.filter(
    (c) => ids.includes(c.responsavelId) && (incluirExcluidos || !c.excluido),
  );
}

export function oportunidadesVisiveis(ids) {
  return carregarDados().oportunidades.filter((o) => ids.includes(o.responsavelId));
}

export function tarefasVisiveis(ids) {
  return carregarDados().tarefas.filter((t) => ids.includes(t.responsavelId));
}

/** RF33 — dados de usuário desativado seguem visíveis, sinalizados. */
export function nomeResponsavel(id) {
  const u = usuarioPorId(id);
  if (!u) return { nome: 'Sem responsável', ativo: false };
  return { nome: u.nome, ativo: u.status === 'Ativo' };
}
