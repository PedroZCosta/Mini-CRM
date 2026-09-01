/**
 * Carga inicial da coleção `clientes` no MongoDB Atlas.
 *
 * Usa a mesma massa determinística que a API já servia, com os mesmos ids
 * (`c1`, `c2`, ...), para que oportunidades, interações e tarefas, que seguem
 * em memória, continuem apontando para os clientes certos.
 *
 * Uso: MONGODB_URI="..." node scripts/seed-mongo.mjs
 */
import { carregarEnvLocal } from './carregar-env.mjs';

carregarEnvLocal();

const { carregarDados } = await import('../src/shared/dados.js');
const { colecaoClientes, encerrar, mongoConfigurado } = await import('../src/shared/mongo.js');

if (!mongoConfigurado()) {
  console.error('Defina MONGODB_URI antes de rodar a carga.');
  process.exit(1);
}

const { clientes } = carregarDados();
const colecao = await colecaoClientes();

await colecao.deleteMany({});
const resultado = await colecao.insertMany(clientes.map((c) => ({ ...c })));

/* Índices que sustentam a busca do RF04 e o escopo por responsável do RF15. */
await colecao.createIndex({ id: 1 }, { unique: true });
await colecao.createIndex({ responsavelId: 1 });
await colecao.createIndex({ nome: 'text', empresa: 'text' });

console.log(`${resultado.insertedCount} clientes gravados na coleção.`);
console.log('Índices criados: id (único), responsavelId, texto em nome e empresa.');
await encerrar();
