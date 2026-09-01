/**
 * Conexão com o MongoDB Atlas.
 *
 * Azure Functions reaproveita o processo entre invocações, então o cliente é
 * criado uma vez por processo e mantido no módulo. Abrir uma conexão nova a cada
 * requisição estouraria o limite de conexões do cluster gratuito.
 *
 * A string de conexão vem da variável de ambiente MONGODB_URI, definida em
 * `api/local.settings.json` no desenvolvimento e nas Application Settings do
 * Static Web Apps em produção. Ela nunca entra no repositório.
 */
import { MongoClient, ServerApiVersion } from 'mongodb';

const URI = process.env.MONGODB_URI || '';
const BANCO = process.env.MONGODB_DB || 'mini_crm';

let cliente = null;
let conexao = null;

export function mongoConfigurado() {
  return URI.length > 0;
}

/** Devolve o banco conectado, reaproveitando a conexão entre invocações. */
export async function conectar() {
  if (!URI) throw new Error('MONGODB_URI não configurada');
  if (!cliente) {
    cliente = new MongoClient(URI, {
      /* Stable API v1, como no exemplo da disciplina. Sem `strict`, porque a
         carga inicial cria índices e a listagem usa collation. */
      serverApi: { version: ServerApiVersion.v1, deprecationErrors: true },
      /* O cluster gratuito M0 aceita poucas conexões simultâneas. */
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    });
    conexao = cliente.connect();
  }
  await conexao;
  return cliente.db(BANCO);
}

/** Coleção de clientes, única entidade persistida de verdade. */
export async function colecaoClientes() {
  const db = await conectar();
  return db.collection('clientes');
}

/** Fecha a conexão. Usado pelos scripts de linha de comando, não pelas Functions. */
export async function encerrar() {
  if (cliente) {
    await cliente.close();
    cliente = null;
    conexao = null;
  }
}

/** O `_id` do Mongo não interessa ao front, que identifica o cliente por `id`. */
export function semObjectId(documento) {
  if (!documento) return documento;
  const { _id, ...resto } = documento;
  return resto;
}
