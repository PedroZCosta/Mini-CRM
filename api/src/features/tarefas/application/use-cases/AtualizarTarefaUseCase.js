import { validarTarefa } from '../../../../shared/validacao.js';
import { marcarAlteracoes } from '../../domain/Tarefa.js';

/** PATCH /api/tarefas/{id} — RF28. */
export class AtualizarTarefaUseCase {
  constructor(tarefaRepository) {
    this.tarefaRepository = tarefaRepository;
  }

  async executar(id, corpo) {
    const erros = validarTarefa(corpo);
    if (erros.length) return { erros };

    const atual = (await this.tarefaRepository.obterPorId(id)) || { id };
    return { tarefa: marcarAlteracoes(atual, corpo, id) };
  }
}
