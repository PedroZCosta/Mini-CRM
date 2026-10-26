import { EscopoService } from '../../shared/EscopoService.js';
import { ClienteConsultaRepository } from '../../shared/ClienteConsultaRepository.js';
import { MockTarefaRepository } from './adapters/persistence/MockTarefaRepository.js';
import { ListarTarefasUseCase } from './application/use-cases/ListarTarefasUseCase.js';
import { AtualizarTarefaUseCase } from './application/use-cases/AtualizarTarefaUseCase.js';
import { registrarRotasTarefas } from './adapters/http/tarefas.controller.js';

const escopoService = new EscopoService();
const clienteConsultaRepository = new ClienteConsultaRepository();
const tarefaRepository = new MockTarefaRepository();

registrarRotasTarefas({
  listarTarefasUseCase: new ListarTarefasUseCase(tarefaRepository, clienteConsultaRepository, escopoService),
  atualizarTarefaUseCase: new AtualizarTarefaUseCase(tarefaRepository),
});
