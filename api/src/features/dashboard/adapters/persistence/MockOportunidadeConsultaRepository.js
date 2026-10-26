import { carregarDados } from '../../../../shared/dados.js';
import { OportunidadeConsultaRepository } from '../../application/ports/OportunidadeConsultaRepository.js';

export class MockOportunidadeConsultaRepository extends OportunidadeConsultaRepository {
  async listarVisiveis(idsPermitidos) {
    return carregarDados().oportunidades.filter((o) => idsPermitidos.includes(o.responsavelId));
  }
}
