import { atendeFiltro } from '../../domain/Usuario.js';

export class ListarUsuariosUseCase {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async executar({ perfil, apenasAtivos } = {}) {
    const usuarios = await this.usuarioRepository.listarTodos();
    const itens = usuarios.filter((u) => atendeFiltro(u, { perfil, apenasAtivos }));
    return { itens, total: itens.length };
  }
}
