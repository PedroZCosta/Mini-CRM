import { InMemoryUsuarioRepository } from './adapters/persistence/InMemoryUsuarioRepository.js';
import { ListarUsuariosUseCase } from './application/use-cases/ListarUsuariosUseCase.js';
import { registrarRotasUsuarios } from './adapters/http/usuarios.controller.js';

const usuarioRepository = new InMemoryUsuarioRepository();
const listarUsuariosUseCase = new ListarUsuariosUseCase(usuarioRepository);

registrarRotasUsuarios({ listarUsuariosUseCase });
