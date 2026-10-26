import { carregarDados } from '../../../../shared/dados.js';
import { TarefaConsultaRepository } from '../../application/ports/TarefaConsultaRepository.js';

export class MockTarefaConsultaRepository extends TarefaConsultaRepository {
  async listarVisiveis(idsPermitidos) {
    return carregarDados().tarefas.filter((t) => idsPermitidos.includes(t.responsavelId));
  }
}
