import { ClienteConsultaRepository } from '../../shared/ClienteConsultaRepository.js';
import { RegistrarInteracaoUseCase } from './application/use-cases/RegistrarInteracaoUseCase.js';
import { registrarRotasInteracoes } from './adapters/http/interacoes.controller.js';

const clienteConsultaRepository = new ClienteConsultaRepository();

registrarRotasInteracoes({
  registrarInteracaoUseCase: new RegistrarInteracaoUseCase(clienteConsultaRepository),
});
