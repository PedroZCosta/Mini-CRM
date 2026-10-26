import { carregarDados } from '../../../../shared/dados.js';
import { OportunidadeRepository } from '../../application/ports/OportunidadeRepository.js';

export class MockOportunidadeRepository extends OportunidadeRepository {
  async listarVisiveis(idsPermitidos) {
    return carregarDados().oportunidades.filter((o) => idsPermitidos.includes(o.responsavelId));
  }

  async obterPorId(id) {
    return carregarDados().oportunidades.find((o) => o.id === id) || null;
  }
}
