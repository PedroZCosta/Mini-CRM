import { app } from '@azure/functions';
import { carregarDados } from '../shared/dados.js';
import { ok } from '../shared/http.js';

/** GET /api/health — confirma que a API subiu e informa o tamanho da massa mock. */
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async (_request, context) => {
    const d = carregarDados();
    context.log('health check');
    return ok({
      status: 'ok',
      api: 'Mini CRM (PJBL) — dados mock',
      referencia: d.referencia,
      registros: {
        usuarios: d.usuarios.length,
        clientes: d.clientes.length,
        interacoes: d.interacoes.length,
        oportunidades: d.oportunidades.length,
        tarefas: d.tarefas.length,
      },
    });
  },
});
