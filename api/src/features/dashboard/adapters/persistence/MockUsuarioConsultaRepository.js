import { carregarDados } from '../../../../shared/dados.js';
import { UsuarioConsultaRepository } from '../../application/ports/UsuarioConsultaRepository.js';

export class MockUsuarioConsultaRepository extends UsuarioConsultaRepository {
  async listarTodos() {
    return carregarDados().usuarios;
  }
}
