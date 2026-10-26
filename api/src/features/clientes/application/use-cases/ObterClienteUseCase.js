import { enriquecerComResponsavel } from '../../domain/Cliente.js';

/** GET /api/clientes/{id} — RF06/RF16. */
export class ObterClienteUseCase {
  constructor(clienteRepository, historicoClienteRepository, escopoService) {
    this.clienteRepository = clienteRepository;
    this.historicoClienteRepository = historicoClienteRepository;
    this.escopoService = escopoService;
  }

  async executar({ usuarioId, id }) {
    const { usuario, ids } = this.escopoService.resolver(usuarioId);
    if (!usuario) return { erro: 'usuarioId não encontrado' };

    const cliente = await this.clienteRepository.obterPorId(id);
    if (!cliente) return { naoEncontrado: `Cliente ${id} não encontrado` };
    if (!ids.includes(cliente.responsavelId)) {
      return { naoEncontrado: `Cliente ${id} não encontrado no escopo deste usuário` };
    }

    const historico = await this.historicoClienteRepository.obterHistorico(id, ids);
    return {
      cliente: enriquecerComResponsavel(cliente, this.escopoService.nomeResponsavel(cliente.responsavelId)),
      ...historico,
    };
  }
}
