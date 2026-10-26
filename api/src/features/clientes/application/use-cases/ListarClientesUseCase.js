import { STATUS_CLIENTE, enriquecerComResponsavel } from '../../domain/Cliente.js';

/** GET /api/clientes — RF03/RF04/RF18. */
export class ListarClientesUseCase {
  constructor(clienteRepository, escopoService) {
    this.clienteRepository = clienteRepository;
    this.escopoService = escopoService;
  }

  async executar({ usuarioId, q = '', status = null, responsavelId = null, pagina = 1, porPagina = 20 }) {
    const { usuario, ids } = this.escopoService.resolver(usuarioId);
    if (!usuario) return { erro: 'usuarioId não encontrado' };

    const criterios = {
      busca: q.trim(),
      status: status && STATUS_CLIENTE.includes(status) ? status : null,
      responsavelId: responsavelId || null,
      idsPermitidos: ids,
    };
    const resultado = await this.clienteRepository.buscarPaginado(criterios, { pagina, porPagina });
    const itens = resultado.itens.map(
      (c) => enriquecerComResponsavel(c, this.escopoService.nomeResponsavel(c.responsavelId)),
    );

    return {
      itens,
      paginacao: resultado.paginacao,
      filtros: {
        q: criterios.busca.toLowerCase(),
        status: criterios.status || 'Todos',
        responsavelId: criterios.responsavelId || 'Todos',
      },
      escopo: { usuarioId: usuario.id, perfil: usuario.perfil, responsaveis: ids },
    };
  }
}
