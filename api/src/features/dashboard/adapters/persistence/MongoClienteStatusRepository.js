import { colecaoClientes } from '../../../../shared/mongo.js';
import { ClienteStatusRepository } from '../../application/ports/ClienteStatusRepository.js';

export class MongoClienteStatusRepository extends ClienteStatusRepository {
  async listarStatusVisiveis(idsPermitidos) {
    const colecao = await colecaoClientes();
    return colecao
      .find({ responsavelId: { $in: idsPermitidos }, excluido: { $ne: true } }, { projection: { status: 1 } })
      .toArray();
  }
}
