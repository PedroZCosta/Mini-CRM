import { app } from '@azure/functions';
import { carregarDados } from '../shared/dados.js';
import { ok } from '../shared/http.js';

/**
 * GET /api/usuarios — usuários do sistema, sem credenciais.
 * Alimenta o seletor de perfil da tela de login e o filtro por vendedor
 * responsável na listagem de clientes (RF04).
 */
app.http('usuarios', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'usuarios',
  handler: async (request) => {
    const { usuarios } = carregarDados();
    const perfil = request.query.get('perfil');
    const apenasAtivos = request.query.get('ativos') === 'true';

    let lista = usuarios;
    if (perfil) lista = lista.filter((u) => u.perfil === perfil);
    if (apenasAtivos) lista = lista.filter((u) => u.status === 'Ativo');

    return ok({ itens: lista, total: lista.length });
  },
});
