import { app } from '@azure/functions';
import { ok, naoEncontrado, erroInterno, protegido } from '../../../../shared/http.js';
import { mongoConfigurado } from '../../../../shared/mongo.js';

export function registrarRotasDashboard({ obterDashboardUseCase }) {
  app.http('dashboard', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dashboard',
    handler: protegido(async (request) => {
      if (!mongoConfigurado()) {
        return erroInterno('MONGODB_URI não configurada: a coleção de clientes não está acessível');
      }
      const resultado = await obterDashboardUseCase.executar({ usuarioId: request.query.get('usuarioId') });
      if (resultado.erro) return naoEncontrado(resultado.erro);
      return ok(resultado);
    }),
  });
}
