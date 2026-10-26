import { app } from '@azure/functions';
import { ok } from '../../../../shared/http.js';

/** GET /api/health — confirma que a API subiu e informa o tamanho da massa mock. */
export function registrarRotasHealth({ obterSaudeUseCase }) {
  app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: async (_request, context) => {
      context.log('health check');
      return ok(await obterSaudeUseCase.executar());
    },
  });
}
