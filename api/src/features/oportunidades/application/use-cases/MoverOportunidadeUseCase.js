import { validarMovimentacao } from '../../../../shared/validacao.js';
import { moverEtapa, promoveClienteParaAtivo, foiReaberta, enriquecerComCliente } from '../../domain/Oportunidade.js';

/** PATCH /api/oportunidades/{id} — RF09/RF29/RF30. */
export class MoverOportunidadeUseCase {
  constructor(oportunidadeRepository, clienteConsultaRepository, escopoService) {
    this.oportunidadeRepository = oportunidadeRepository;
    this.clienteConsultaRepository = clienteConsultaRepository;
    this.escopoService = escopoService;
  }

  async executar(id, corpo) {
    const atual = await this.oportunidadeRepository.obterPorId(id);
    const erros = validarMovimentacao(corpo, atual);
    if (erros.length) return { erros };

    const movimentada = moverEtapa(atual, { ...corpo, id });
    const cliente = await this.clienteConsultaRepository.obterPorId(movimentada.clienteId);

    return {
      oportunidade: enriquecerComCliente(movimentada, cliente, this.escopoService.nomeResponsavel(movimentada.responsavelId)),
      clienteStatus: promoveClienteParaAtivo(corpo) ? 'Ativo' : null,
      reaberta: foiReaberta(atual, corpo),
    };
  }
}
