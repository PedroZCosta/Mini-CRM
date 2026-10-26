export class HistoricoClienteRepository {
  /** @returns {Promise<{interacoes: object[], oportunidades: object[], tarefas: object[]}>} */
  async obterHistorico(clienteId, idsPermitidos) {
    throw new Error('HistoricoClienteRepository.obterHistorico não implementado');
  }
}
