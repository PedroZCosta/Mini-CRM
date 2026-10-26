import { carregarDados } from '../../../../shared/dados.js';
import { UsuarioRepository } from '../../application/ports/UsuarioRepository.js';

export class InMemoryUsuarioRepository extends UsuarioRepository {
  async listarTodos() {
    return carregarDados().usuarios;
  }
}
