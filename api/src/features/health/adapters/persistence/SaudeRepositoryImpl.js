import { carregarDados } from '../../../../shared/dados.js';
import { conectar, mongoConfigurado } from '../../../../shared/mongo.js';
import { SaudeRepository } from '../../application/ports/SaudeRepository.js';

export class SaudeRepositoryImpl extends SaudeRepository {
  async obterReferenciaERegistros() {
    const d = carregarDados();
    return {
      referencia: d.referencia,
      registros: {
        usuarios: d.usuarios.length,
        clientes: d.clientes.length,
        interacoes: d.interacoes.length,
        oportunidades: d.oportunidades.length,
        tarefas: d.tarefas.length,
      },
    };
  }

  /** Estado da conexão com o Atlas, sem derrubar o health se o banco falhar. */
  async obterEstadoDoBanco() {
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
}
