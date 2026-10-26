import { carregarDados } from '../../../../shared/dados.js';
import { TarefaRepository } from '../../application/ports/TarefaRepository.js';

export class MockTarefaRepository extends TarefaRepository {
  async listarVisiveis(idsPermitidos) {
    return carregarDados().tarefas.filter((t) => idsPermitidos.includes(t.responsavelId));
  }

  async obterPorId(id) {
    return carregarDados().tarefas.find((t) => t.id === id) || null;
  }
}
