import { enriquecerComResponsavel } from '../../domain/Cliente.js';

/** DELETE /api/clientes/{id} — RF03. Exclusão lógica. */
export class ExcluirClienteUseCase {
  constructor(clienteRepository, escopoService) {
    this.clienteRepository = clienteRepository;
    this.escopoService = escopoService;
  }

  async executar(id) {
    const cliente = await this.clienteRepository.aplicarExclusaoLogica(id);
    if (!cliente) return { naoEncontrado: `Cliente ${id} não encontrado` };
    return { cliente: enriquecerComResponsavel(cliente, this.escopoService.nomeResponsavel(cliente.responsavelId)) };
  }
}
