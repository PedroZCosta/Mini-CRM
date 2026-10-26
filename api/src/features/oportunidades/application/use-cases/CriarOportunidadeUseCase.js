import { validarOportunidade } from '../../../../shared/validacao.js';
import { novoId } from '../../../../shared/http.js';
import { criarOportunidadeProspeccao, enriquecerComCliente } from '../../domain/Oportunidade.js';

/** POST /api/oportunidades — RF07. */
export class CriarOportunidadeUseCase {
  constructor(clienteConsultaRepository, escopoService) {
    this.clienteConsultaRepository = clienteConsultaRepository;
    this.escopoService = escopoService;
  }

  async executar(corpo) {
    const erros = validarOportunidade(corpo);
    if (erros.length) return { erros };

    const cliente = await this.clienteConsultaRepository.obterPorId(corpo.clienteId);
    const oportunidade = criarOportunidadeProspeccao(corpo, cliente, novoId);
    return { oportunidade: enriquecerComCliente(oportunidade, cliente, this.escopoService.nomeResponsavel(oportunidade.responsavelId)) };
  }
}
