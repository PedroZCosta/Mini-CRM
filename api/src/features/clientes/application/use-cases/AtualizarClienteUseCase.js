import { validarCliente } from '../../../../shared/validacao.js';
import { enriquecerComResponsavel } from '../../domain/Cliente.js';

/** PATCH /api/clientes/{id} — RF03. */
export class AtualizarClienteUseCase {
  constructor(clienteRepository, escopoService) {
    this.clienteRepository = clienteRepository;
    this.escopoService = escopoService;
  }

  async executar(id, corpo) {
    const erros = validarCliente(corpo, { parcial: true });
    if (erros.length) return { erros };

    const alterados = { ...corpo };
    delete alterados.id;
    delete alterados._id;

    const cliente = await this.clienteRepository.atualizar(id, alterados);
    if (!cliente) return { naoEncontrado: `Cliente ${id} não encontrado` };
    return { cliente: enriquecerComResponsavel(cliente, this.escopoService.nomeResponsavel(cliente.responsavelId)) };
  }
}
