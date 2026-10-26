import { aplicarExclusaoLogica } from '../../domain/Cliente.js';
import { ClienteRepository } from '../../application/ports/ClienteRepository.js';
import { colecaoClientes, semObjectId } from '../../../../shared/mongo.js';

/** Escapa o texto da busca para usá-lo como expressão regular no Mongo. */
function comoRegex(texto) {
  return new RegExp(texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

export class MongoClienteRepository extends ClienteRepository {
  async buscarPaginado({ busca, status, responsavelId, idsPermitidos }, { pagina, porPagina }) {
    const filtro = { responsavelId: { $in: idsPermitidos }, excluido: { $ne: true } };
    if (busca) {
      const termo = comoRegex(busca);
      filtro.$or = [{ nome: termo }, { empresa: termo }];
    }
    if (status) filtro.status = status;
    if (responsavelId) filtro.responsavelId = responsavelId;

    const colecao = await colecaoClientes();
    const total = await colecao.countDocuments(filtro);
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
    const paginaAtual = Math.min(Math.max(1, Number(pagina) || 1), totalPaginas);

    const documentos = await colecao
      .find(filtro)
      .collation({ locale: 'pt' })
      .sort({ nome: 1 })
      .skip((paginaAtual - 1) * porPagina)
      .limit(porPagina)
      .toArray();

    return {
      itens: documentos.map(semObjectId),
      paginacao: { pagina: paginaAtual, porPagina, total, totalPaginas },
    };
  }

  async obterPorId(id) {
    const colecao = await colecaoClientes();
    return semObjectId(await colecao.findOne({ id }));
  }

  async inserir(cliente) {
    const colecao = await colecaoClientes();
    await colecao.insertOne({ ...cliente });
    return cliente;
  }

  async atualizar(id, alteracoes) {
    const colecao = await colecaoClientes();
    const cliente = await colecao.findOneAndUpdate(
      { id },
      { $set: alteracoes },
      { returnDocument: 'after' },
    );
    return semObjectId(cliente);
  }

  async aplicarExclusaoLogica(id) {
    const colecao = await colecaoClientes();
    const { status, excluido } = aplicarExclusaoLogica({});
    const cliente = await colecao.findOneAndUpdate(
      { id },
      { $set: { status, excluido } },
      { returnDocument: 'after' },
    );
    return semObjectId(cliente);
  }
}
