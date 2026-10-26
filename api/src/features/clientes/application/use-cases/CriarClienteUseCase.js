import { validarCliente } from '../../../../shared/validacao.js';
import { novoId } from '../../../../shared/http.js';
import { criarClienteProspect, enriquecerComResponsavel } from '../../domain/Cliente.js';

/** POST /api/clientes — RF03/RF30. */
export class CriarClienteUseCase {
  constructor(clienteRepository, escopoService) {
    this.clienteRepository = clienteRepository;
    this.escopoService = escopoService;
  }

  async executar(corpo) {
    const erros = validarCliente(corpo);
    if (erros.length) return { erros };

    const cliente = criarClienteProspect(corpo, novoId);
    await this.clienteRepository.inserir(cliente);
    return { cliente: enriquecerComResponsavel(cliente, this.escopoService.nomeResponsavel(cliente.responsavelId)) };
  }
}
