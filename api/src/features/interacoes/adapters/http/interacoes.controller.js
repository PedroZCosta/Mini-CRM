import { app } from '@azure/functions';
import { criado, requisicaoInvalida, naoEncontrado, lerCorpo } from '../../../../shared/http.js';

/** POST /api/clientes/{id}/interacoes — RF05. */
export function registrarRotasInteracoes({ registrarInteracaoUseCase }) {
  app.http('interacoes-criar', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'clientes/{id}/interacoes',
    handler: async (request) => {
      const corpo = await lerCorpo(request);
      if (!corpo) return requisicaoInvalida('Envie um corpo JSON com tipo e observação');

      const resultado = await registrarInteracaoUseCase.executar(request.params.id, corpo);
      if (resultado.naoEncontrado) return naoEncontrado(resultado.naoEncontrado);
      if (resultado.erros) return requisicaoInvalida('Interação inválida', resultado.erros);
      return criado(resultado.interacao);
    },
  });
}
