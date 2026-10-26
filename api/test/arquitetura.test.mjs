/**
 * Testes de arquitetura (ArchUnitTS) — verificam, de forma automatizada, as
 * regras de Vertical Slice + Clean Architecture + SOLID aplicadas ao
 * backend. Diferente dos outros arquivos em api/test/, estes não testam
 * comportamento (entrada → saída): testam a ESTRUTURA do código-fonte —
 * quem tem permissão de importar quem.
 *
 * Rodar: npm test --prefix api -- (ou) node --test api/test/arquitetura.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { projectFiles } from 'archunit';

/* Caminho absoluto do tsconfig.json de api/, independente de onde o
   comando `node --test` for executado (raiz do repo ou dentro de api/). */
const TSCONFIG = join(dirname(dirname(fileURLToPath(import.meta.url))), 'tsconfig.json');

const SLICES = ['clientes', 'oportunidades', 'tarefas', 'dashboard', 'interacoes', 'usuarios', 'health'];

const arquivos = () => projectFiles(TSCONFIG);
const formatar = (violacoes) => `${violacoes.length} violação(ões):\n${JSON.stringify(violacoes, null, 2)}`;

/**
 * Regra das Dependências (Clean Architecture): "código-fonte só deve
 * apontar para dentro". Um ciclo significa duas camadas dependendo uma da
 * outra, o que nunca deveria acontecer num backend organizado em slices.
 */
test('backend inteiro não tem ciclos de dependência', async () => {
  const regra = arquivos().inFolder('src/**').should().haveNoCycles();
  const violacoes = await regra.check();
  assert.equal(violacoes.length, 0, formatar(violacoes));
});

/**
 * Camada 1 da Clean Architecture (Entities): domain/ é a regra de negócio
 * pura. Não pode depender de adapters/ (HTTP, Mongo, massa mock) — senão
 * deixaria de ser testável sem subir infraestrutura.
 */
test('domain não depende de adapters em nenhuma slice', async () => {
  const regra = arquivos()
    .inFolder('src/features/*/domain/**')
    .shouldNot()
    .dependOnFiles()
    .inFolder('src/features/*/adapters/**');
  const violacoes = await regra.check();
  assert.equal(violacoes.length, 0, formatar(violacoes));
});

/**
 * Também a Regra das Dependências: Entities não conhecem Use Cases — é o
 * use case que depende da entidade, nunca o contrário.
 */
test('domain não depende de application em nenhuma slice', async () => {
  const regra = arquivos()
    .inFolder('src/features/*/domain/**')
    .shouldNot()
    .dependOnFiles()
    .inFolder('src/features/*/application/**');
  const violacoes = await regra.check();
  assert.equal(violacoes.length, 0, formatar(violacoes));
});

/**
 * "Sem Spring / Sem SQL / Sem HTTP" (slide da Clean Architecture, camada
 * Entities): domain/ não pode importar o framework de Functions nem o
 * driver do Mongo diretamente.
 */
test('domain não importa @azure/functions nem mongodb diretamente', async () => {
  const regra = arquivos()
    .inFolder('src/features/*/domain/**')
    .should()
    .adhereTo(
      (arquivo) => !/from\s+['"](@azure\/functions|mongodb)['"]/.test(arquivo.content),
      'Entity não pode importar @azure/functions nem mongodb — a regra de negócio precisa rodar sem infraestrutura',
    );
  const violacoes = await regra.check();
  assert.equal(violacoes.length, 0, formatar(violacoes));
});

/**
 * Dependency Inversion Principle (SOLID) + Camada 2 (Use Cases): o use
 * case depende do port (interface), nunca da implementação concreta do
 * adapter. Quem implementa o port é o adapter — a seta aponta para dentro.
 */
test('application não depende de adapters em nenhuma slice', async () => {
  const regra = arquivos()
    .inFolder('src/features/*/application/**')
    .shouldNot()
    .dependOnFiles()
    .inFolder('src/features/*/adapters/**');
  const violacoes = await regra.check();
  assert.equal(violacoes.length, 0, formatar(violacoes));
});

/**
 * Vertical Slice Architecture: "shared mínimo, dependências explícitas".
 * Uma slice nunca importa arquivo de dentro de outra slice — o que é
 * comum entre elas vive em shared/ (kernel), não numa slice específica.
 * Um teste por slice, para apontar exatamente qual delas quebrou a regra.
 */
for (const slice of SLICES) {
  test(`slice "${slice}" não depende de nenhuma outra slice`, async () => {
    const regra = arquivos()
      .inFolder(`src/features/${slice}/**`)
      .shouldNot()
      .dependOnFiles()
      .inFolder('src/features/**', { except: `src/features/${slice}/**` });
    const violacoes = await regra.check();
    assert.equal(violacoes.length, 0, formatar(violacoes));
  });
}

/**
 * Convenção de nomenclatura dos ports (Interface Segregation / Dependency
 * Inversion): todo arquivo em application/ports/ representa um contrato
 * de repositório e termina em "Repository.js".
 */
test('ports em application/ports seguem a convenção *Repository.js', async () => {
  const regra = arquivos()
    .inFolder('src/features/*/application/ports/**')
    .should()
    .haveName('*Repository.js');
  const violacoes = await regra.check();
  assert.equal(violacoes.length, 0, formatar(violacoes));
});

/**
 * Convenção de nomenclatura dos use cases (Single Responsibility): um
 * arquivo por operação, nome terminando em "UseCase.js".
 */
test('use cases em application/use-cases seguem a convenção *UseCase.js', async () => {
  const regra = arquivos()
    .inFolder('src/features/*/application/use-cases/**')
    .should()
    .haveName('*UseCase.js');
  const violacoes = await regra.check();
  assert.equal(violacoes.length, 0, formatar(violacoes));
});
