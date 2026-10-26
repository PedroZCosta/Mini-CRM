import { carregarDados } from '../../../../shared/dados.js';
import { EscopoService } from '../../../../shared/EscopoService.js';
import { HistoricoClienteRepository } from '../../application/ports/HistoricoClienteRepository.js';

const escopoService = new EscopoService();

/** RF16 — histórico do cliente (interações, oportunidades e tarefas vinculadas). */
export class MockHistoricoClienteRepository extends HistoricoClienteRepository {
  async obterHistorico(clienteId, idsPermitidos) {
    const dados = carregarDados();
    const oportunidades = escopoService.oportunidadesVisiveis(idsPermitidos)
      .filter((o) => o.clienteId === clienteId);
    const idsOportunidades = oportunidades.map((o) => o.id);

    return {
      interacoes: dados.interacoes
        .filter((i) => i.clienteId === clienteId)
        .sort((a, b) => b.data.localeCompare(a.data)),
      oportunidades: oportunidades.sort((a, b) => b.atualizada.localeCompare(a.atualizada)),
      tarefas: escopoService.tarefasVisiveis(idsPermitidos)
        .filter((t) => t.clienteId === clienteId || idsOportunidades.includes(t.vinculoOppId))
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    };
  }
}
