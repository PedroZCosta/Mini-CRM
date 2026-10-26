import { EscopoService } from '../../shared/EscopoService.js';
import { MongoClienteRepository } from './adapters/persistence/MongoClienteRepository.js';
import { MockHistoricoClienteRepository } from './adapters/persistence/MockHistoricoClienteRepository.js';
import { ListarClientesUseCase } from './application/use-cases/ListarClientesUseCase.js';
import { ObterClienteUseCase } from './application/use-cases/ObterClienteUseCase.js';
import { CriarClienteUseCase } from './application/use-cases/CriarClienteUseCase.js';
import { AtualizarClienteUseCase } from './application/use-cases/AtualizarClienteUseCase.js';
import { ExcluirClienteUseCase } from './application/use-cases/ExcluirClienteUseCase.js';
import { registrarRotasClientes } from './adapters/http/clientes.controller.js';

const escopoService = new EscopoService();
const clienteRepository = new MongoClienteRepository();
const historicoClienteRepository = new MockHistoricoClienteRepository();

registrarRotasClientes({
  listarClientesUseCase: new ListarClientesUseCase(clienteRepository, escopoService),
  obterClienteUseCase: new ObterClienteUseCase(clienteRepository, historicoClienteRepository, escopoService),
  criarClienteUseCase: new CriarClienteUseCase(clienteRepository, escopoService),
  atualizarClienteUseCase: new AtualizarClienteUseCase(clienteRepository, escopoService),
  excluirClienteUseCase: new ExcluirClienteUseCase(clienteRepository, escopoService),
});
