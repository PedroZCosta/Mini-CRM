import { ETAPAS, enriquecerComCliente } from '../../domain/Oportunidade.js';

/** GET /api/oportunidades — RF08/RF19. */
export class ListarOportunidadesUseCase {
  constructor(oportunidadeRepository, clienteConsultaRepository, escopoService) {
    this.oportunidadeRepository = oportunidadeRepository;
    this.clienteConsultaRepository = clienteConsultaRepository;
    this.escopoService = escopoService;
  }

  async executar({ usuarioId, etapa }) {
    const { usuario, ids } = this.escopoService.resolver(usuarioId);
    if (!usuario) return { erro: 'usuarioId não encontrado' };

    const clientes = await this.clienteConsultaRepository.listarTodos();
    const clientesPorId = new Map(clientes.map((c) => [c.id, c]));

    let lista = (await this.oportunidadeRepository.listarVisiveis(ids)).map(
      (o) => enriquecerComCliente(o, clientesPorId.get(o.clienteId), this.escopoService.nomeResponsavel(o.responsavelId)),
    );
    if (etapa && ETAPAS.includes(etapa)) lista = lista.filter((o) => o.etapa === etapa);

    const etapas = ETAPAS.map((e) => {
      const itens = lista.filter((o) => o.etapa === e).sort((a, b) => b.valor - a.valor);
      return {
        etapa: e,
        quantidade: itens.length,
        valorTotal: itens.reduce((soma, o) => soma + o.valor, 0),
        ganhas: itens.filter((o) => o.resultado === 'ganho').length,
        perdidas: itens.filter((o) => o.resultado === 'perdido').length,
        itens,
      };
    });

    const emAberto = lista.filter((o) => o.etapa !== 'Fechado');
    return {
      etapas,
      total: lista.length,
      valorEmNegociacao: emAberto.reduce((soma, o) => soma + o.valor, 0),
      escopo: { usuarioId: usuario.id, perfil: usuario.perfil },
    };
  }
}
