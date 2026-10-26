/** GET /api/tarefas — RF10/RF13. */
export class ListarTarefasUseCase {
  constructor(tarefaRepository, clienteConsultaRepository, escopoService) {
    this.tarefaRepository = tarefaRepository;
    this.clienteConsultaRepository = clienteConsultaRepository;
    this.escopoService = escopoService;
  }

  async executar({ usuarioId, status }) {
    const { usuario, ids } = this.escopoService.resolver(usuarioId);
    if (!usuario) return { erro: 'usuarioId não encontrado' };

    let lista = await this.tarefaRepository.listarVisiveis(ids);
    if (status) lista = lista.filter((t) => t.status === status);

    const clientes = await this.clienteConsultaRepository.listarTodos();
    const clientesPorId = new Map(clientes.map((c) => [c.id, c]));
    lista = lista
      .map((t) => ({ ...t, clienteNome: clientesPorId.get(t.clienteId)?.nome || '—' }))
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

    const porFaixa = (faixa) => lista.filter((t) => t.faixa === faixa).length;
    return {
      itens: lista,
      total: lista.length,
      resumo: {
        pendentes: lista.filter((t) => t.status === 'pendente').length,
        concluidas: lista.filter((t) => t.status === 'concluida').length,
        vencidas: porFaixa('vencida'),
        hoje: porFaixa('hoje'),
        amanha: porFaixa('amanha'),
        proximos15Dias: porFaixa('quinze'),
      },
    };
  }
}
