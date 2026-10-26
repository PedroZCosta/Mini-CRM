import { app } from '@azure/functions';
import { ok } from '../../../../shared/http.js';

/**
 * GET /api/usuarios — usuários do sistema, sem credenciais.
 * Alimenta o seletor de perfil da tela de login e o filtro por vendedor
 * responsável na listagem de clientes (RF04).
 */
export function registrarRotasUsuarios({ listarUsuariosUseCase }) {
  app.http('usuarios', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'usuarios',
    handler: async (request) => {
      const perfil = request.query.get('perfil');
      const apenasAtivos = request.query.get('ativos') === 'true';
      const resultado = await listarUsuariosUseCase.executar({ perfil, apenasAtivos });
      return ok(resultado);
    },
  });
}
