import { app } from '@azure/functions';
import {
  ok, criado, requisicaoInvalida, naoEncontrado, erroInterno, lerCorpo, protegido,
} from '../../../../shared/http.js';
import { mongoConfigurado } from '../../../../shared/mongo.js';

function bancoIndisponivel() {
  return erroInterno('MONGODB_URI não configurada: a coleção de clientes não está acessível');
}

export function registrarRotasClientes({
  listarClientesUseCase, obterClienteUseCase, criarClienteUseCase,
  atualizarClienteUseCase, excluirClienteUseCase,
}) {
  app.http('clientes-listar', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'clientes',
    handler: protegido(async (request) => {
      if (!mongoConfigurado()) return bancoIndisponivel();
      const resultado = await listarClientesUseCase.executar({
        usuarioId: request.query.get('usuarioId'),
        q: request.query.get('q') || '',
        status: request.query.get('status'),
        responsavelId: request.query.get('responsavelId'),
        pagina: Number(request.query.get('pagina')) || 1,
        porPagina: Number(request.query.get('porPagina')) || 20,
      });
      if (resultado.erro) return naoEncontrado(resultado.erro);
      return ok(resultado);
    }),
  });

  app.http('clientes-detalhe', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'clientes/{id}',
    handler: protegido(async (request) => {
      if (!mongoConfigurado()) return bancoIndisponivel();
      const resultado = await obterClienteUseCase.executar({
        usuarioId: request.query.get('usuarioId'),
        id: request.params.id,
      });
      if (resultado.erro) return naoEncontrado(resultado.erro);
      if (resultado.naoEncontrado) return naoEncontrado(resultado.naoEncontrado);
      return ok(resultado);
    }),
  });

  app.http('clientes-criar', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'clientes',
    handler: protegido(async (request) => {
      if (!mongoConfigurado()) return bancoIndisponivel();
      const corpo = await lerCorpo(request);
      if (!corpo) return requisicaoInvalida('Envie um corpo JSON com os dados do cliente');

      const resultado = await criarClienteUseCase.executar(corpo);
      if (resultado.erros) return requisicaoInvalida('Cliente inválido', resultado.erros);
      return criado(resultado.cliente);
    }),
  });

  app.http('clientes-atualizar', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    route: 'clientes/{id}',
    handler: protegido(async (request) => {
      if (!mongoConfigurado()) return bancoIndisponivel();
      const corpo = await lerCorpo(request);
      if (!corpo) return requisicaoInvalida('Envie um corpo JSON com os campos a alterar');

      const resultado = await atualizarClienteUseCase.executar(request.params.id, corpo);
      if (resultado.erros) return requisicaoInvalida('Alteração inválida', resultado.erros);
      if (resultado.naoEncontrado) return naoEncontrado(resultado.naoEncontrado);
      return ok(resultado.cliente);
    }),
  });

  app.http('clientes-excluir', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'clientes/{id}',
    handler: protegido(async (request) => {
      if (!mongoConfigurado()) return bancoIndisponivel();
      const resultado = await excluirClienteUseCase.executar(request.params.id);
      if (resultado.naoEncontrado) return naoEncontrado(resultado.naoEncontrado);
      return ok({
        ...resultado.cliente,
        mensagem: 'Exclusão lógica aplicada: o cliente sai das listagens e o histórico é preservado.',
      });
    }),
  });
}
