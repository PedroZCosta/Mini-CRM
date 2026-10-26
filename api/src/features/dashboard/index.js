import { EscopoService } from '../../shared/EscopoService.js';
import { MongoClienteStatusRepository } from './adapters/persistence/MongoClienteStatusRepository.js';
import { MockOportunidadeConsultaRepository } from './adapters/persistence/MockOportunidadeConsultaRepository.js';
import { MockTarefaConsultaRepository } from './adapters/persistence/MockTarefaConsultaRepository.js';
import { MockUsuarioConsultaRepository } from './adapters/persistence/MockUsuarioConsultaRepository.js';
import { ObterDashboardUseCase } from './application/use-cases/ObterDashboardUseCase.js';
import { registrarRotasDashboard } from './adapters/http/dashboard.controller.js';

const escopoService = new EscopoService();

registrarRotasDashboard({
  obterDashboardUseCase: new ObterDashboardUseCase(
    new MongoClienteStatusRepository(),
    new MockOportunidadeConsultaRepository(),
    new MockTarefaConsultaRepository(),
    new MockUsuarioConsultaRepository(),
    escopoService,
  ),
});
