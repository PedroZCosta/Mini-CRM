import { app } from '@azure/functions';
import { ok, requisicaoInvalida, naoEncontrado, lerCorpo } from '../../../../shared/http.js';

export function registrarRotasTarefas({ listarTarefasUseCase, atualizarTarefaUseCase }) {
  app.http('tarefas-listar', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'tarefas',
    handler: async (request) => {
      const resultado = await listarTarefasUseCase.executar({
        usuarioId: request.query.get('usuarioId'),
        status: request.query.get('status'),
      });
      if (resultado.erro) return naoEncontrado(resultado.erro);
      return ok(resultado);
    },
  });

  app.http('tarefas-atualizar', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    route: 'tarefas/{id}',
    handler: async (request) => {
      const corpo = await lerCorpo(request);
      if (!corpo) return requisicaoInvalida('Envie um corpo JSON com os campos a alterar');

      const resultado = await atualizarTarefaUseCase.executar(request.params.id, corpo);
      if (resultado.erros) return requisicaoInvalida('Alteração inválida', resultado.erros);
      return ok(resultado.tarefa);
    },
  });
}
