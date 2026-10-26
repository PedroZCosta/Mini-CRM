export class ClienteRepository {
  /**
   * @param {{busca:string, status:string|null, responsavelId:string|null, idsPermitidos:string[]}} criterios
   * @param {{pagina:number, porPagina:number}} paginacao
   */
  async buscarPaginado(criterios, paginacao) {
    throw new Error('ClienteRepository.buscarPaginado não implementado');
  }

  async obterPorId(id) {
    throw new Error('ClienteRepository.obterPorId não implementado');
  }

  async inserir(cliente) {
    throw new Error('ClienteRepository.inserir não implementado');
  }

  async atualizar(id, alteracoes) {
    throw new Error('ClienteRepository.atualizar não implementado');
  }

  async aplicarExclusaoLogica(id) {
    throw new Error('ClienteRepository.aplicarExclusaoLogica não implementado');
  }
}
