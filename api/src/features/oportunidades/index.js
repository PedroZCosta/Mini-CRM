import { EscopoService } from '../../shared/EscopoService.js';
import { ClienteConsultaRepository } from '../../shared/ClienteConsultaRepository.js';
import { MockOportunidadeRepository } from './adapters/persistence/MockOportunidadeRepository.js';
import { ListarOportunidadesUseCase } from './application/use-cases/ListarOportunidadesUseCase.js';
import { CriarOportunidadeUseCase } from './application/use-cases/CriarOportunidadeUseCase.js';
import { MoverOportunidadeUseCase } from './application/use-cases/MoverOportunidadeUseCase.js';
import { registrarRotasOportunidades } from './adapters/http/oportunidades.controller.js';

const escopoService = new EscopoService();
const clienteConsultaRepository = new ClienteConsultaRepository();
const oportunidadeRepository = new MockOportunidadeRepository();

registrarRotasOportunidades({
  listarOportunidadesUseCase: new ListarOportunidadesUseCase(oportunidadeRepository, clienteConsultaRepository, escopoService),
  criarOportunidadeUseCase: new CriarOportunidadeUseCase(clienteConsultaRepository, escopoService),
  moverOportunidadeUseCase: new MoverOportunidadeUseCase(oportunidadeRepository, clienteConsultaRepository, escopoService),
});
