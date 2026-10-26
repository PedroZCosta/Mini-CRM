import { app } from '@azure/functions';
import { ok, criado, requisicaoInvalida, naoEncontrado, lerCorpo } from '../../../../shared/http.js';

export function registrarRotasOportunidades({
  listarOportunidadesUseCase, criarOportunidadeUseCase, moverOportunidadeUseCase,
}) {
  app.http('oportunidades-listar', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'oportunidades',
    handler: async (request) => {
      const resultado = await listarOportunidadesUseCase.executar({
        usuarioId: request.query.get('usuarioId'),
        etapa: request.query.get('etapa'),
      });
      if (resultado.erro) return naoEncontrado(resultado.erro);
      return ok(resultado);
    },
  });

  app.http('oportunidades-criar', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'oportunidades',
    handler: async (request) => {
      const corpo = await lerCorpo(request);
      if (!corpo) return requisicaoInvalida('Envie um corpo JSON com os dados da oportunidade');

      const resultado = await criarOportunidadeUseCase.executar(corpo);
      if (resultado.erros) return requisicaoInvalida('Oportunidade inválida', resultado.erros);
      return criado(resultado.oportunidade);
    },
  });

  app.http('oportunidades-mover', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    route: 'oportunidades/{id}',
    handler: async (request) => {
      const corpo = await lerCorpo(request);
      if (!corpo) return requisicaoInvalida('Envie um corpo JSON com a etapa de destino');

      const resultado = await moverOportunidadeUseCase.executar(request.params.id, corpo);
      if (resultado.erros) return requisicaoInvalida('Movimentação inválida', resultado.erros);
      return ok(resultado);
    },
  });
}
