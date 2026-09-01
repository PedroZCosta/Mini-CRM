import { app } from '@azure/functions';
import { carregarDados } from '../shared/dados.js';
import { ok } from '../shared/http.js';
import { conectar, mongoConfigurado } from '../shared/mongo.js';

/** Estado da conexão com o Atlas, sem derrubar o health se o banco falhar. */
async function estadoDoBanco() {
  if (!mongoConfigurado()) return { configurado: false, conectado: false };
  try {
    const db = await conectar();
    await db.command({ ping: 1 });
    const clientes = await db.collection('clientes').countDocuments({});
    return { configurado: true, conectado: true, clientes };
  } catch (e) {
    return { configurado: true, conectado: false, erro: e.message };
  }
}

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
      api: 'Mini CRM (PJBL) — clientes no MongoDB, demais entidades mock',
      referencia: d.referencia,
      banco: await estadoDoBanco(),
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
