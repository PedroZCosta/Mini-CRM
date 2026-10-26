# Backend Vertical Slice + Clean Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar o backend do Mini CRM (`api/`) de `functions/` + `shared/` por tipo técnico para `features/<slice>/{domain,application,adapters}` + `shared/` (kernel), aplicando Clean Architecture e SOLID dentro de cada vertical slice, sem alterar nenhum comportamento observável da API.

**Architecture:** Cada uma das 7 áreas de rota vira uma slice com 4 camadas internas (`domain` → `application/ports` + `application/use-cases` → `adapters/http` + `adapters/persistence` → `index.js` como composition root). `api/src/shared/` é o kernel: infraestrutura (`http.js`, `mongo.js`, `dados.js`) e serviço de domínio cross-cutting (`escopo.js`, `EscopoService.js`, `ClienteConsultaRepository.js`, `validacao.js`) usados por mais de uma slice. Verificação é por regressão: os 30 casos de `api/scripts/testar-api.mjs` continuam passando sem nenhuma alteração no próprio script (além do import), e cada slice ganha um teste unitário do seu módulo `domain/` (puro, sem Mongo/HTTP) para demonstrar a testabilidade que a Clean Architecture promete.

**Tech Stack:** Node.js 22 (ESM), `@azure/functions` v4 (programmatic model), `mongodb` driver, `node:test` + `node:assert` para os testes unitários (sem dependência nova).

**Spec:** [docs/superpowers/specs/2026-10-05-backend-vertical-slice-clean-architecture-design.md](../specs/2026-10-05-backend-vertical-slice-clean-architecture-design.md)

## Global Constraints

- Nenhuma rota, contrato JSON ou regra de negócio pode mudar de fora — refatoração pura de estrutura.
- `node api/scripts/testar-api.mjs` (30 casos) precisa passar sem alteração no arquivo, exceto os `import` dos handlers.
- Rodar os scripts da API sempre com Node 22: `source ~/.nvm/nvm.sh && nvm use 22` antes de qualquer `node api/...`.
- Nenhum arquivo de `api/src/functions/` sobrevive ao final — tudo migra para `api/src/features/`.
- Sem mudança no front-end (`app/`).
- Nenhum `git push` sem confirmação explícita do usuário.

---

### Task 1: Kernel compartilhado — ajustes de base

**Files:**
- Modify: `api/src/shared/escopo.js`
- Create: `api/src/shared/EscopoService.js`
- Create: `api/src/shared/ClienteConsultaRepository.js`
- Create: `api/src/shared/README.md`
- Test: `api/test/escopo.test.mjs`

**Interfaces:**
- Produces: `resolverEscopo(usuarioId: string|null): { usuario, ids, padrao }` (substitui `escopoDaRequisicao(request)`); `EscopoService` com métodos `resolver(usuarioId)`, `oportunidadesVisiveis(ids)`, `tarefasVisiveis(ids)`, `nomeResponsavel(id)`; `ClienteConsultaRepository` com métodos `async listarTodos()` e `async obterPorId(id)` (lê `carregarDados().clientes`, a massa mock — não é o MongoDB).

- [ ] **Step 1: Mudar `escopoDaRequisicao(request)` para `resolverEscopo(usuarioId)`**

A função original lia `request.query.get('usuarioId')` diretamente — uma regra de domínio (RF15) dependendo de um tipo do Azure Functions, o que viola a Dependency Rule (o núcleo não pode depender de um detalhe externo). Isso é só um detalhe interno do módulo: o comportamento observável da API (status, JSON) não muda, porque cada controller HTTP vai extrair `usuarioId` da query e passar como string.

Em `api/src/shared/escopo.js`, troque a função:

```js
/**
 * Resolve o usuário a partir do `usuarioId` informado.
 * Sem `usuarioId`, assume o Administrador do seed: facilita testar a API no
 * navegador ou no Postman sem montar a query inteira.
 */
export function resolverEscopo(usuarioId) {
  if (!usuarioId) {
    const admin = carregarDados().usuarios.find((u) => u.perfil === 'Admin');
    return { usuario: admin, ids: idsVisiveis(admin), padrao: true };
  }
  const usuario = usuarioPorId(usuarioId);
  if (!usuario) return { usuario: null, ids: [], padrao: false };
  return { usuario, ids: idsVisiveis(usuario), padrao: false };
}
```

Isso substitui a função `escopoDaRequisicao` existente (mesmo arquivo, remova a antiga). O resto do arquivo (`usuarioPorId`, `idsVisiveis`, `clientesVisiveis`, `oportunidadesVisiveis`, `tarefasVisiveis`, `nomeResponsavel`) não muda.

- [ ] **Step 2: Criar `EscopoService`**

Adapta as funções de `escopo.js` para uma dependência injetável — qualquer use case que precisa de escopo recebe este serviço pelo construtor, em vez de importar funções soltas. Isso é o que permite testar um use case com um escopo falso, sem tocar na massa mock real.

Crie `api/src/shared/EscopoService.js`:

```js
import {
  resolverEscopo, oportunidadesVisiveis, tarefasVisiveis, nomeResponsavel,
} from './escopo.js';

/**
 * Serviço de domínio compartilhado (RF15) injetado nos use cases das
 * slices que precisam saber o que cada usuário enxerga.
 */
export class EscopoService {
  resolver(usuarioId) {
    return resolverEscopo(usuarioId);
  }

  oportunidadesVisiveis(ids) {
    return oportunidadesVisiveis(ids);
  }

  tarefasVisiveis(ids) {
    return tarefasVisiveis(ids);
  }

  nomeResponsavel(id) {
    return nomeResponsavel(id);
  }
}
```

- [ ] **Step 3: Criar `ClienteConsultaRepository` (leitura mock de clientes)**

As slices `oportunidades`, `tarefas` e `interacoes` não são donas do cadastro de cliente (isso é da slice `clientes`, que fala com o MongoDB) — elas só precisam resolver nome/empresa/responsável a partir da massa mock, igual ao código original. Em vez de cada slice reimportar `carregarDados()` direto, isso vira um pequeno repositório compartilhado:

Crie `api/src/shared/ClienteConsultaRepository.js`:

```js
import { carregarDados } from './dados.js';

/**
 * Leitura simples de clientes a partir da massa mock. Usada por slices que
 * não são donas do cadastro (oportunidades, tarefas, interações) só para
 * resolver nome/empresa/responsável. O CRUD de verdade fica na slice
 * `clientes`, que fala com o MongoDB.
 */
export class ClienteConsultaRepository {
  async listarTodos() {
    return carregarDados().clientes;
  }

  async obterPorId(id) {
    return carregarDados().clientes.find((c) => c.id === id) || null;
  }
}
```

- [ ] **Step 4: Documentar o papel do kernel**

Crie `api/src/shared/README.md`:

```markdown
# Kernel compartilhado

Infraestrutura e serviços de domínio usados por mais de uma vertical slice
em `api/src/features/`. Nada aqui conhece uma rota específica — é o "shared
mínimo" que a Vertical Slice Architecture recomenda manter pequeno:

| Arquivo | Papel |
|---|---|
| `dados.js` | Carrega e converte a massa mock (offsets de dias → datas reais). |
| `mongo.js` | Driver do MongoDB Atlas — a única persistência real do projeto. |
| `http.js` | Protocolo de resposta HTTP padronizado das Functions. |
| `escopo.js` / `EscopoService.js` | RF15 — o que cada perfil de usuário enxerga. |
| `ClienteConsultaRepository.js` | Leitura mock de clientes, para slices que só precisam do nome/empresa. |
| `validacao.js` | Validação dos corpos de escrita, compartilhada pelas regras de negócio. |

Uma slice nunca importa arquivo de dentro de outra slice. Se duas ou mais
slices precisam do mesmo dado ou da mesma regra, o compartilhado entra aqui.
```

- [ ] **Step 5: Teste unitário do `resolverEscopo`**

Crie `api/test/escopo.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolverEscopo } from '../src/shared/escopo.js';

test('resolverEscopo sem usuarioId assume o Administrador do seed', () => {
  const { usuario, padrao } = resolverEscopo(null);
  assert.equal(usuario.perfil, 'Admin');
  assert.equal(padrao, true);
});

test('resolverEscopo com usuarioId inexistente devolve usuario nulo', () => {
  const { usuario, ids } = resolverEscopo('nao-existe');
  assert.equal(usuario, null);
  assert.deepEqual(ids, []);
});
```

- [ ] **Step 6: Rodar o teste**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node --test api/test/escopo.test.mjs`
Expected: 2 testes passando.

- [ ] **Step 7: Commit**

```bash
git add api/src/shared/escopo.js api/src/shared/EscopoService.js api/src/shared/ClienteConsultaRepository.js api/src/shared/README.md api/test/escopo.test.mjs
git commit -m "refactor(kernel): extrai EscopoService e ClienteConsultaRepository do shared

Troca escopoDaRequisicao(request) por resolverEscopo(usuarioId) para o
kernel parar de depender do tipo de request do Azure Functions, e cria os
dois pontos de extensao que as vertical slices vao injetar.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Slices `usuarios` e `health` (Lincoln Neto)

**Files:**
- Create: `api/src/features/usuarios/domain/Usuario.js`
- Create: `api/src/features/usuarios/application/ports/UsuarioRepository.js`
- Create: `api/src/features/usuarios/application/use-cases/ListarUsuariosUseCase.js`
- Create: `api/src/features/usuarios/adapters/persistence/InMemoryUsuarioRepository.js`
- Create: `api/src/features/usuarios/adapters/http/usuarios.controller.js`
- Create: `api/src/features/usuarios/index.js`
- Create: `api/src/features/health/application/ports/SaudeRepository.js`
- Create: `api/src/features/health/application/use-cases/ObterSaudeUseCase.js`
- Create: `api/src/features/health/adapters/persistence/SaudeRepositoryImpl.js`
- Create: `api/src/features/health/adapters/http/health.controller.js`
- Create: `api/src/features/health/index.js`
- Test: `api/test/usuarios.domain.test.mjs`

**Interfaces:**
- Consumes: nada de outra slice (usuarios/health não dependem de clientes/oportunidades/etc).
- Produces: `registrarRotasUsuarios({ listarUsuariosUseCase })` e `registrarRotasHealth({ obterSaudeUseCase })`, chamadas pelo próprio `index.js` da slice — nenhuma outra slice usa isso.

- [ ] **Step 1: Entidade `Usuario` (regra de filtro)**

Crie `api/src/features/usuarios/domain/Usuario.js`:

```js
/** Regra de negócio: decide se um usuário atende ao filtro pedido. */
export function atendeFiltro(usuario, { perfil, apenasAtivos }) {
  if (perfil && usuario.perfil !== perfil) return false;
  if (apenasAtivos && usuario.status !== 'Ativo') return false;
  return true;
}
```

- [ ] **Step 2: Teste unitário da regra de filtro**

Crie `api/test/usuarios.domain.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atendeFiltro } from '../src/features/usuarios/domain/Usuario.js';

test('atendeFiltro filtra por perfil', () => {
  assert.equal(atendeFiltro({ perfil: 'Vendedor', status: 'Ativo' }, { perfil: 'Gerente' }), false);
  assert.equal(atendeFiltro({ perfil: 'Vendedor', status: 'Ativo' }, { perfil: 'Vendedor' }), true);
});

test('atendeFiltro filtra apenas ativos', () => {
  assert.equal(atendeFiltro({ perfil: 'Vendedor', status: 'Inativo' }, { apenasAtivos: true }), false);
  assert.equal(atendeFiltro({ perfil: 'Vendedor', status: 'Ativo' }, { apenasAtivos: true }), true);
});
```

- [ ] **Step 3: Rodar o teste e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node --test api/test/usuarios.domain.test.mjs`
Expected: 2 testes passando.

- [ ] **Step 4: Port + Use Case de listagem**

Crie `api/src/features/usuarios/application/ports/UsuarioRepository.js`:

```js
export class UsuarioRepository {
  async listarTodos() {
    throw new Error('UsuarioRepository.listarTodos não implementado');
  }
}
```

Crie `api/src/features/usuarios/application/use-cases/ListarUsuariosUseCase.js`:

```js
import { atendeFiltro } from '../../domain/Usuario.js';

export class ListarUsuariosUseCase {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async executar({ perfil, apenasAtivos } = {}) {
    const usuarios = await this.usuarioRepository.listarTodos();
    const itens = usuarios.filter((u) => atendeFiltro(u, { perfil, apenasAtivos }));
    return { itens, total: itens.length };
  }
}
```

- [ ] **Step 5: Adapter de persistência (mock) + controller + composition root**

Crie `api/src/features/usuarios/adapters/persistence/InMemoryUsuarioRepository.js`:

```js
import { carregarDados } from '../../../../shared/dados.js';
import { UsuarioRepository } from '../../application/ports/UsuarioRepository.js';

export class InMemoryUsuarioRepository extends UsuarioRepository {
  async listarTodos() {
    return carregarDados().usuarios;
  }
}
```

Crie `api/src/features/usuarios/adapters/http/usuarios.controller.js`:

```js
import { app } from '@azure/functions';
import { ok } from '../../../../shared/http.js';

/**
 * GET /api/usuarios — usuários do sistema, sem credenciais.
 * Alimenta o seletor de perfil da tela de login e o filtro por vendedor
 * responsável na listagem de clientes (RF04).
 */
export function registrarRotasUsuarios({ listarUsuariosUseCase }) {
  app.http('usuarios', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'usuarios',
    handler: async (request) => {
      const perfil = request.query.get('perfil');
      const apenasAtivos = request.query.get('ativos') === 'true';
      const resultado = await listarUsuariosUseCase.executar({ perfil, apenasAtivos });
      return ok(resultado);
    },
  });
}
```

Crie `api/src/features/usuarios/index.js`:

```js
import { InMemoryUsuarioRepository } from './adapters/persistence/InMemoryUsuarioRepository.js';
import { ListarUsuariosUseCase } from './application/use-cases/ListarUsuariosUseCase.js';
import { registrarRotasUsuarios } from './adapters/http/usuarios.controller.js';

const usuarioRepository = new InMemoryUsuarioRepository();
const listarUsuariosUseCase = new ListarUsuariosUseCase(usuarioRepository);

registrarRotasUsuarios({ listarUsuariosUseCase });
```

- [ ] **Step 6: Slice `health` — port, use case, adapter, controller, composition root**

Crie `api/src/features/health/application/ports/SaudeRepository.js`:

```js
export class SaudeRepository {
  async obterReferenciaERegistros() {
    throw new Error('SaudeRepository.obterReferenciaERegistros não implementado');
  }

  async obterEstadoDoBanco() {
    throw new Error('SaudeRepository.obterEstadoDoBanco não implementado');
  }
}
```

Crie `api/src/features/health/application/use-cases/ObterSaudeUseCase.js`:

```js
export class ObterSaudeUseCase {
  constructor(saudeRepository) {
    this.saudeRepository = saudeRepository;
  }

  async executar() {
    const { referencia, registros } = await this.saudeRepository.obterReferenciaERegistros();
    const banco = await this.saudeRepository.obterEstadoDoBanco();
    return {
      status: 'ok',
      api: 'Mini CRM (PJBL) — clientes no MongoDB, demais entidades mock',
      referencia,
      banco,
      registros,
    };
  }
}
```

Crie `api/src/features/health/adapters/persistence/SaudeRepositoryImpl.js`:

```js
import { carregarDados } from '../../../../shared/dados.js';
import { conectar, mongoConfigurado } from '../../../../shared/mongo.js';
import { SaudeRepository } from '../../application/ports/SaudeRepository.js';

export class SaudeRepositoryImpl extends SaudeRepository {
  async obterReferenciaERegistros() {
    const d = carregarDados();
    return {
      referencia: d.referencia,
      registros: {
        usuarios: d.usuarios.length,
        clientes: d.clientes.length,
        interacoes: d.interacoes.length,
        oportunidades: d.oportunidades.length,
        tarefas: d.tarefas.length,
      },
    };
  }

  /** Estado da conexão com o Atlas, sem derrubar o health se o banco falhar. */
  async obterEstadoDoBanco() {
    if (!mongoConfigurado()) return { configurado: false, conectado: false };
    try {
      const db = await conectar();
      await db.command({ ping: 1 });
      const clientes = await db.collection('clientes').countDocuments({});
      return { configurado: true, conectado: true, clientes };
    } catch (e) {
      return { configurado: true, conectado: false, erro: e.message };
    }
  }
}
```

Crie `api/src/features/health/adapters/http/health.controller.js`:

```js
import { app } from '@azure/functions';
import { ok } from '../../../../shared/http.js';

/** GET /api/health — confirma que a API subiu e informa o tamanho da massa mock. */
export function registrarRotasHealth({ obterSaudeUseCase }) {
  app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: async (_request, context) => {
      context.log('health check');
      return ok(await obterSaudeUseCase.executar());
    },
  });
}
```

Crie `api/src/features/health/index.js`:

```js
import { SaudeRepositoryImpl } from './adapters/persistence/SaudeRepositoryImpl.js';
import { ObterSaudeUseCase } from './application/use-cases/ObterSaudeUseCase.js';
import { registrarRotasHealth } from './adapters/http/health.controller.js';

const saudeRepository = new SaudeRepositoryImpl();
const obterSaudeUseCase = new ObterSaudeUseCase(saudeRepository);

registrarRotasHealth({ obterSaudeUseCase });
```

- [ ] **Step 7: Commit**

```bash
git add api/src/features/usuarios api/src/features/health api/test/usuarios.domain.test.mjs
git commit -m "feat(usuarios,health): migra para vertical slice com Clean Architecture

Cada slice ganha domain/application/adapters proprios e um composition
root (index.js). Comportamento identico as Functions antigas.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Slice `clientes` (Nicolas Tancon)

**Files:**
- Create: `api/src/features/clientes/domain/Cliente.js`
- Create: `api/src/features/clientes/application/ports/ClienteRepository.js`
- Create: `api/src/features/clientes/application/ports/HistoricoClienteRepository.js`
- Create: `api/src/features/clientes/application/use-cases/ListarClientesUseCase.js`
- Create: `api/src/features/clientes/application/use-cases/ObterClienteUseCase.js`
- Create: `api/src/features/clientes/application/use-cases/CriarClienteUseCase.js`
- Create: `api/src/features/clientes/application/use-cases/AtualizarClienteUseCase.js`
- Create: `api/src/features/clientes/application/use-cases/ExcluirClienteUseCase.js`
- Create: `api/src/features/clientes/adapters/persistence/MongoClienteRepository.js`
- Create: `api/src/features/clientes/adapters/persistence/MockHistoricoClienteRepository.js`
- Create: `api/src/features/clientes/adapters/http/clientes.controller.js`
- Create: `api/src/features/clientes/index.js`
- Test: `api/test/clientes.domain.test.mjs`

**Interfaces:**
- Consumes: `EscopoService` do kernel (Task 1). Não depende de nenhuma outra slice.
- Produces: nada que outra slice consuma diretamente — `oportunidades`/`tarefas`/`interacoes` leem cliente via `ClienteConsultaRepository` do kernel (mock), nunca importando nada de dentro de `features/clientes`.

- [ ] **Step 1: Entidade `Cliente`**

Crie `api/src/features/clientes/domain/Cliente.js`:

```js
export const STATUS_CLIENTE = ['Prospect', 'Ativo', 'Inativo'];

/** RF33 — acrescenta o nome do responsável e a marca de responsável inativo. */
export function enriquecerComResponsavel(cliente, { nome, ativo }) {
  return { ...cliente, responsavelNome: nome, semResponsavelAtivo: !ativo };
}

/** RF03 — exclusão lógica: vira Inativo e some das listagens. */
export function aplicarExclusaoLogica(cliente) {
  return { ...cliente, status: 'Inativo', excluido: true };
}

/** RF03/RF30 — todo cliente novo nasce como Prospect. */
export function criarClienteProspect({ nome, empresa, email, telefone, responsavelId }, gerarId) {
  return {
    id: gerarId('c'),
    nome: nome.trim(),
    empresa: empresa.trim(),
    email: email.trim(),
    telefone: (telefone || '').trim(),
    status: 'Prospect',
    responsavelId,
    excluido: false,
  };
}
```

- [ ] **Step 2: Teste unitário da entidade**

Crie `api/test/clientes.domain.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarClienteProspect, aplicarExclusaoLogica, enriquecerComResponsavel } from '../src/features/clientes/domain/Cliente.js';

test('criarClienteProspect nasce como Prospect e com campos aparados', () => {
  const gerarId = (prefixo) => `${prefixo}_teste`;
  const cliente = criarClienteProspect({
    nome: ' Ana ', empresa: ' Acme ', email: ' ana@acme.com ', telefone: '', responsavelId: 'u1',
  }, gerarId);
  assert.equal(cliente.status, 'Prospect');
  assert.equal(cliente.nome, 'Ana');
  assert.equal(cliente.id, 'c_teste');
  assert.equal(cliente.excluido, false);
});

test('aplicarExclusaoLogica marca Inativo e excluido sem apagar o registro', () => {
  const resultado = aplicarExclusaoLogica({ id: 'c1', nome: 'Ana', status: 'Ativo', excluido: false });
  assert.equal(resultado.status, 'Inativo');
  assert.equal(resultado.excluido, true);
  assert.equal(resultado.nome, 'Ana');
});

test('enriquecerComResponsavel sinaliza responsavel inativo (RF33)', () => {
  const resultado = enriquecerComResponsavel({ id: 'c1' }, { nome: 'Rui', ativo: false });
  assert.equal(resultado.responsavelNome, 'Rui');
  assert.equal(resultado.semResponsavelAtivo, true);
});
```

- [ ] **Step 3: Rodar o teste e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node --test api/test/clientes.domain.test.mjs`
Expected: 3 testes passando.

- [ ] **Step 4: Ports**

Crie `api/src/features/clientes/application/ports/ClienteRepository.js`:

```js
export class ClienteRepository {
  /**
   * @param {{busca:string, status:string|null, responsavelId:string|null, idsPermitidos:string[]}} criterios
   * @param {{pagina:number, porPagina:number}} paginacao
   */
  async buscarPaginado(criterios, paginacao) {
    throw new Error('ClienteRepository.buscarPaginado não implementado');
  }

  async obterPorId(id) {
    throw new Error('ClienteRepository.obterPorId não implementado');
  }

  async inserir(cliente) {
    throw new Error('ClienteRepository.inserir não implementado');
  }

  async atualizar(id, alteracoes) {
    throw new Error('ClienteRepository.atualizar não implementado');
  }

  async aplicarExclusaoLogica(id) {
    throw new Error('ClienteRepository.aplicarExclusaoLogica não implementado');
  }
}
```

Crie `api/src/features/clientes/application/ports/HistoricoClienteRepository.js`:

```js
export class HistoricoClienteRepository {
  /** @returns {Promise<{interacoes: object[], oportunidades: object[], tarefas: object[]}>} */
  async obterHistorico(clienteId, idsPermitidos) {
    throw new Error('HistoricoClienteRepository.obterHistorico não implementado');
  }
}
```

- [ ] **Step 5: Use Cases (um por operação — SRP)**

Crie `api/src/features/clientes/application/use-cases/ListarClientesUseCase.js`:

```js
import { STATUS_CLIENTE, enriquecerComResponsavel } from '../../domain/Cliente.js';

/** GET /api/clientes — RF03/RF04/RF18. */
export class ListarClientesUseCase {
  constructor(clienteRepository, escopoService) {
    this.clienteRepository = clienteRepository;
    this.escopoService = escopoService;
  }

  async executar({ usuarioId, q = '', status = null, responsavelId = null, pagina = 1, porPagina = 20 }) {
    const { usuario, ids } = this.escopoService.resolver(usuarioId);
    if (!usuario) return { erro: 'usuarioId não encontrado' };

    const criterios = {
      busca: q.trim(),
      status: status && STATUS_CLIENTE.includes(status) ? status : null,
      responsavelId: responsavelId || null,
      idsPermitidos: ids,
    };
    const resultado = await this.clienteRepository.buscarPaginado(criterios, { pagina, porPagina });
    const itens = resultado.itens.map(
      (c) => enriquecerComResponsavel(c, this.escopoService.nomeResponsavel(c.responsavelId)),
    );

    return {
      itens,
      paginacao: resultado.paginacao,
      filtros: {
        q: criterios.busca.toLowerCase(),
        status: criterios.status || 'Todos',
        responsavelId: criterios.responsavelId || 'Todos',
      },
      escopo: { usuarioId: usuario.id, perfil: usuario.perfil, responsaveis: ids },
    };
  }
}
```

Crie `api/src/features/clientes/application/use-cases/ObterClienteUseCase.js`:

```js
import { enriquecerComResponsavel } from '../../domain/Cliente.js';

/** GET /api/clientes/{id} — RF06/RF16. */
export class ObterClienteUseCase {
  constructor(clienteRepository, historicoClienteRepository, escopoService) {
    this.clienteRepository = clienteRepository;
    this.historicoClienteRepository = historicoClienteRepository;
    this.escopoService = escopoService;
  }

  async executar({ usuarioId, id }) {
    const { usuario, ids } = this.escopoService.resolver(usuarioId);
    if (!usuario) return { erro: 'usuarioId não encontrado' };

    const cliente = await this.clienteRepository.obterPorId(id);
    if (!cliente) return { naoEncontrado: `Cliente ${id} não encontrado` };
    if (!ids.includes(cliente.responsavelId)) {
      return { naoEncontrado: `Cliente ${id} não encontrado no escopo deste usuário` };
    }

    const historico = await this.historicoClienteRepository.obterHistorico(id, ids);
    return {
      cliente: enriquecerComResponsavel(cliente, this.escopoService.nomeResponsavel(cliente.responsavelId)),
      ...historico,
    };
  }
}
```

Crie `api/src/features/clientes/application/use-cases/CriarClienteUseCase.js`:

```js
import { validarCliente } from '../../../../shared/validacao.js';
import { novoId } from '../../../../shared/http.js';
import { criarClienteProspect, enriquecerComResponsavel } from '../../domain/Cliente.js';

/** POST /api/clientes — RF03/RF30. */
export class CriarClienteUseCase {
  constructor(clienteRepository, escopoService) {
    this.clienteRepository = clienteRepository;
    this.escopoService = escopoService;
  }

  async executar(corpo) {
    const erros = validarCliente(corpo);
    if (erros.length) return { erros };

    const cliente = criarClienteProspect(corpo, novoId);
    await this.clienteRepository.inserir(cliente);
    return { cliente: enriquecerComResponsavel(cliente, this.escopoService.nomeResponsavel(cliente.responsavelId)) };
  }
}
```

Crie `api/src/features/clientes/application/use-cases/AtualizarClienteUseCase.js`:

```js
import { validarCliente } from '../../../../shared/validacao.js';
import { enriquecerComResponsavel } from '../../domain/Cliente.js';

/** PATCH /api/clientes/{id} — RF03. */
export class AtualizarClienteUseCase {
  constructor(clienteRepository, escopoService) {
    this.clienteRepository = clienteRepository;
    this.escopoService = escopoService;
  }

  async executar(id, corpo) {
    const erros = validarCliente(corpo, { parcial: true });
    if (erros.length) return { erros };

    const alterados = { ...corpo };
    delete alterados.id;
    delete alterados._id;

    const cliente = await this.clienteRepository.atualizar(id, alterados);
    if (!cliente) return { naoEncontrado: `Cliente ${id} não encontrado` };
    return { cliente: enriquecerComResponsavel(cliente, this.escopoService.nomeResponsavel(cliente.responsavelId)) };
  }
}
```

Crie `api/src/features/clientes/application/use-cases/ExcluirClienteUseCase.js`:

```js
import { enriquecerComResponsavel } from '../../domain/Cliente.js';

/** DELETE /api/clientes/{id} — RF03. Exclusão lógica. */
export class ExcluirClienteUseCase {
  constructor(clienteRepository, escopoService) {
    this.clienteRepository = clienteRepository;
    this.escopoService = escopoService;
  }

  async executar(id) {
    const cliente = await this.clienteRepository.aplicarExclusaoLogica(id);
    if (!cliente) return { naoEncontrado: `Cliente ${id} não encontrado` };
    return { cliente: enriquecerComResponsavel(cliente, this.escopoService.nomeResponsavel(cliente.responsavelId)) };
  }
}
```

- [ ] **Step 6: Adapters de persistência**

Crie `api/src/features/clientes/adapters/persistence/MongoClienteRepository.js`:

```js
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
```

Nota: o filtro só aplica o `status` que chega — a checagem `STATUS_CLIENTE.includes(status)` já aconteceu no use case (`ListarClientesUseCase`), então o adapter de persistência não precisa validar de novo. O `aplicarExclusaoLogica` domínio é reaproveitado aqui (chamado com `{}` para obter os dois campos fixos `{status: 'Inativo', excluido: true}`) em vez de duplicar os valores literais.

Crie `api/src/features/clientes/adapters/persistence/MockHistoricoClienteRepository.js`:

```js
import { carregarDados } from '../../../../shared/dados.js';
import { EscopoService } from '../../../../shared/EscopoService.js';
import { HistoricoClienteRepository } from '../../application/ports/HistoricoClienteRepository.js';

const escopoService = new EscopoService();

/** RF16 — histórico do cliente (interações, oportunidades e tarefas vinculadas). */
export class MockHistoricoClienteRepository extends HistoricoClienteRepository {
  async obterHistorico(clienteId, idsPermitidos) {
    const dados = carregarDados();
    const oportunidades = escopoService.oportunidadesVisiveis(idsPermitidos)
      .filter((o) => o.clienteId === clienteId);
    const idsOportunidades = oportunidades.map((o) => o.id);

    return {
      interacoes: dados.interacoes
        .filter((i) => i.clienteId === clienteId)
        .sort((a, b) => b.data.localeCompare(a.data)),
      oportunidades: oportunidades.sort((a, b) => b.atualizada.localeCompare(a.atualizada)),
      tarefas: escopoService.tarefasVisiveis(idsPermitidos)
        .filter((t) => t.clienteId === clienteId || idsOportunidades.includes(t.vinculoOppId))
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    };
  }
}
```

- [ ] **Step 7: Controller HTTP + composition root**

Crie `api/src/features/clientes/adapters/http/clientes.controller.js`:

```js
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
```

Crie `api/src/features/clientes/index.js`:

```js
import { EscopoService } from '../../shared/EscopoService.js';
import { MongoClienteRepository } from './adapters/persistence/MongoClienteRepository.js';
import { MockHistoricoClienteRepository } from './adapters/persistence/MockHistoricoClienteRepository.js';
import { ListarClientesUseCase } from './application/use-cases/ListarClientesUseCase.js';
import { ObterClienteUseCase } from './application/use-cases/ObterClienteUseCase.js';
import { CriarClienteUseCase } from './application/use-cases/CriarClienteUseCase.js';
import { AtualizarClienteUseCase } from './application/use-cases/AtualizarClienteUseCase.js';
import { ExcluirClienteUseCase } from './application/use-cases/ExcluirClienteUseCase.js';
import { registrarRotasClientes } from './adapters/http/clientes.controller.js';

const escopoService = new EscopoService();
const clienteRepository = new MongoClienteRepository();
const historicoClienteRepository = new MockHistoricoClienteRepository();

registrarRotasClientes({
  listarClientesUseCase: new ListarClientesUseCase(clienteRepository, escopoService),
  obterClienteUseCase: new ObterClienteUseCase(clienteRepository, historicoClienteRepository, escopoService),
  criarClienteUseCase: new CriarClienteUseCase(clienteRepository, escopoService),
  atualizarClienteUseCase: new AtualizarClienteUseCase(clienteRepository, escopoService),
  excluirClienteUseCase: new ExcluirClienteUseCase(clienteRepository, escopoService),
});
```

- [ ] **Step 8: Commit**

```bash
git add api/src/features/clientes api/test/clientes.domain.test.mjs
git commit -m "feat(clientes): migra para vertical slice com Clean Architecture

Entity Cliente, 5 use cases (um por operacao, SRP), ports ClienteRepository
e HistoricoClienteRepository (DIP), MongoClienteRepository como adapter de
saida real e MockHistoricoClienteRepository para o historico vindo da
massa mock. Comportamento identico as 5 rotas antigas.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Slice `oportunidades` (Leandro Canha, parte 1)

**Files:**
- Create: `api/src/features/oportunidades/domain/Oportunidade.js`
- Create: `api/src/features/oportunidades/application/ports/OportunidadeRepository.js`
- Create: `api/src/features/oportunidades/application/use-cases/ListarOportunidadesUseCase.js`
- Create: `api/src/features/oportunidades/application/use-cases/CriarOportunidadeUseCase.js`
- Create: `api/src/features/oportunidades/application/use-cases/MoverOportunidadeUseCase.js`
- Create: `api/src/features/oportunidades/adapters/persistence/MockOportunidadeRepository.js`
- Create: `api/src/features/oportunidades/adapters/http/oportunidades.controller.js`
- Create: `api/src/features/oportunidades/index.js`
- Test: `api/test/oportunidades.domain.test.mjs`

**Interfaces:**
- Consumes: `EscopoService` e `ClienteConsultaRepository` do kernel (Task 1).
- Produces: nada consumido por outra slice.

- [ ] **Step 1: Entidade `Oportunidade`**

Crie `api/src/features/oportunidades/domain/Oportunidade.js`:

```js
export const ETAPAS = ['Prospecção', 'Contato', 'Proposta', 'Fechado'];

export function enriquecerComCliente(oportunidade, cliente, responsavel) {
  return {
    ...oportunidade,
    clienteNome: cliente ? cliente.nome : 'Cliente removido',
    clienteEmpresa: cliente ? cliente.empresa : '—',
    responsavelNome: responsavel.nome,
    semResponsavelAtivo: !responsavel.ativo,
  };
}

/** RF07 — nasce em Prospecção, salvo etapa informada. */
export function criarOportunidadeProspeccao({ clienteId, titulo, etapa, valor, dataPrevista, responsavelId }, clienteEncontrado, gerarId) {
  const hoje = new Date().toISOString().slice(0, 10);
  return {
    id: gerarId('o'),
    clienteId,
    titulo: titulo.trim(),
    etapa: etapa || 'Prospecção',
    resultado: null,
    motivoPerda: null,
    valor: Number(valor),
    dataPrevista: dataPrevista || hoje,
    atualizada: hoje,
    responsavelId: responsavelId || clienteEncontrado?.responsavelId || null,
  };
}

/** RF09/RF29 — aplica a movimentação de etapa, resolvendo resultado e motivo. */
export function moverEtapa(atual, corpo) {
  const fechando = corpo.etapa === 'Fechado';
  return {
    ...(atual || { id: corpo.id }),
    etapa: corpo.etapa,
    resultado: fechando ? corpo.resultado : null,
    motivoPerda: fechando && corpo.resultado === 'perdido' ? corpo.motivoPerda : null,
    atualizada: new Date().toISOString().slice(0, 10),
  };
}

/** RF30 — a primeira oportunidade ganha promove o cliente a Ativo. */
export function promoveClienteParaAtivo(corpo) {
  return corpo.etapa === 'Fechado' && corpo.resultado === 'ganho';
}

/** RF09 — sair de Fechado sem reabrir explicitamente é bloqueado na validação. */
export function foiReaberta(atual, corpo) {
  return Boolean(atual && atual.etapa === 'Fechado' && corpo.etapa !== 'Fechado');
}
```

- [ ] **Step 2: Teste unitário da entidade**

Crie `api/test/oportunidades.domain.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moverEtapa, promoveClienteParaAtivo, foiReaberta } from '../src/features/oportunidades/domain/Oportunidade.js';

test('moverEtapa zera resultado e motivo quando a etapa nao e Fechado', () => {
  const atual = { id: 'o1', etapa: 'Fechado', resultado: 'perdido', motivoPerda: 'Preço' };
  const movimentada = moverEtapa(atual, { etapa: 'Contato', reabrir: true });
  assert.equal(movimentada.resultado, null);
  assert.equal(movimentada.motivoPerda, null);
});

test('promoveClienteParaAtivo so e verdadeiro ao fechar como ganho (RF30)', () => {
  assert.equal(promoveClienteParaAtivo({ etapa: 'Fechado', resultado: 'ganho' }), true);
  assert.equal(promoveClienteParaAtivo({ etapa: 'Fechado', resultado: 'perdido' }), false);
  assert.equal(promoveClienteParaAtivo({ etapa: 'Contato' }), false);
});

test('foiReaberta detecta saida de uma oportunidade fechada (RF09)', () => {
  assert.equal(foiReaberta({ etapa: 'Fechado' }, { etapa: 'Contato' }), true);
  assert.equal(foiReaberta({ etapa: 'Contato' }, { etapa: 'Proposta' }), false);
});
```

- [ ] **Step 3: Rodar o teste e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node --test api/test/oportunidades.domain.test.mjs`
Expected: 3 testes passando.

- [ ] **Step 4: Port + Use Cases**

Crie `api/src/features/oportunidades/application/ports/OportunidadeRepository.js`:

```js
export class OportunidadeRepository {
  async listarVisiveis(idsPermitidos) {
    throw new Error('OportunidadeRepository.listarVisiveis não implementado');
  }

  async obterPorId(id) {
    throw new Error('OportunidadeRepository.obterPorId não implementado');
  }
}
```

Crie `api/src/features/oportunidades/application/use-cases/ListarOportunidadesUseCase.js`:

```js
import { ETAPAS, enriquecerComCliente } from '../../domain/Oportunidade.js';

/** GET /api/oportunidades — RF08/RF19. */
export class ListarOportunidadesUseCase {
  constructor(oportunidadeRepository, clienteConsultaRepository, escopoService) {
    this.oportunidadeRepository = oportunidadeRepository;
    this.clienteConsultaRepository = clienteConsultaRepository;
    this.escopoService = escopoService;
  }

  async executar({ usuarioId, etapa }) {
    const { usuario, ids } = this.escopoService.resolver(usuarioId);
    if (!usuario) return { erro: 'usuarioId não encontrado' };

    const clientes = await this.clienteConsultaRepository.listarTodos();
    const clientesPorId = new Map(clientes.map((c) => [c.id, c]));

    let lista = (await this.oportunidadeRepository.listarVisiveis(ids)).map(
      (o) => enriquecerComCliente(o, clientesPorId.get(o.clienteId), this.escopoService.nomeResponsavel(o.responsavelId)),
    );
    if (etapa && ETAPAS.includes(etapa)) lista = lista.filter((o) => o.etapa === etapa);

    const etapas = ETAPAS.map((e) => {
      const itens = lista.filter((o) => o.etapa === e).sort((a, b) => b.valor - a.valor);
      return {
        etapa: e,
        quantidade: itens.length,
        valorTotal: itens.reduce((soma, o) => soma + o.valor, 0),
        ganhas: itens.filter((o) => o.resultado === 'ganho').length,
        perdidas: itens.filter((o) => o.resultado === 'perdido').length,
        itens,
      };
    });

    const emAberto = lista.filter((o) => o.etapa !== 'Fechado');
    return {
      etapas,
      total: lista.length,
      valorEmNegociacao: emAberto.reduce((soma, o) => soma + o.valor, 0),
      escopo: { usuarioId: usuario.id, perfil: usuario.perfil },
    };
  }
}
```

Crie `api/src/features/oportunidades/application/use-cases/CriarOportunidadeUseCase.js`:

```js
import { validarOportunidade } from '../../../../shared/validacao.js';
import { novoId } from '../../../../shared/http.js';
import { criarOportunidadeProspeccao, enriquecerComCliente } from '../../domain/Oportunidade.js';

/** POST /api/oportunidades — RF07. */
export class CriarOportunidadeUseCase {
  constructor(clienteConsultaRepository, escopoService) {
    this.clienteConsultaRepository = clienteConsultaRepository;
    this.escopoService = escopoService;
  }

  async executar(corpo) {
    const erros = validarOportunidade(corpo);
    if (erros.length) return { erros };

    const cliente = await this.clienteConsultaRepository.obterPorId(corpo.clienteId);
    const oportunidade = criarOportunidadeProspeccao(corpo, cliente, novoId);
    return { oportunidade: enriquecerComCliente(oportunidade, cliente, this.escopoService.nomeResponsavel(oportunidade.responsavelId)) };
  }
}
```

Crie `api/src/features/oportunidades/application/use-cases/MoverOportunidadeUseCase.js`:

```js
import { validarMovimentacao } from '../../../../shared/validacao.js';
import { moverEtapa, promoveClienteParaAtivo, foiReaberta, enriquecerComCliente } from '../../domain/Oportunidade.js';

/** PATCH /api/oportunidades/{id} — RF09/RF29/RF30. */
export class MoverOportunidadeUseCase {
  constructor(oportunidadeRepository, clienteConsultaRepository, escopoService) {
    this.oportunidadeRepository = oportunidadeRepository;
    this.clienteConsultaRepository = clienteConsultaRepository;
    this.escopoService = escopoService;
  }

  async executar(id, corpo) {
    const atual = await this.oportunidadeRepository.obterPorId(id);
    const erros = validarMovimentacao(corpo, atual);
    if (erros.length) return { erros };

    const movimentada = moverEtapa(atual, { ...corpo, id });
    const cliente = await this.clienteConsultaRepository.obterPorId(movimentada.clienteId);

    return {
      oportunidade: enriquecerComCliente(movimentada, cliente, this.escopoService.nomeResponsavel(movimentada.responsavelId)),
      clienteStatus: promoveClienteParaAtivo(corpo) ? 'Ativo' : null,
      reaberta: foiReaberta(atual, corpo),
    };
  }
}
```

- [ ] **Step 5: Adapter de persistência + controller + composition root**

Crie `api/src/features/oportunidades/adapters/persistence/MockOportunidadeRepository.js`:

```js
import { carregarDados } from '../../../../shared/dados.js';
import { OportunidadeRepository } from '../../application/ports/OportunidadeRepository.js';

export class MockOportunidadeRepository extends OportunidadeRepository {
  async listarVisiveis(idsPermitidos) {
    return carregarDados().oportunidades.filter((o) => idsPermitidos.includes(o.responsavelId));
  }

  async obterPorId(id) {
    return carregarDados().oportunidades.find((o) => o.id === id) || null;
  }
}
```

Crie `api/src/features/oportunidades/adapters/http/oportunidades.controller.js`:

```js
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
```

Crie `api/src/features/oportunidades/index.js`:

```js
import { EscopoService } from '../../shared/EscopoService.js';
import { ClienteConsultaRepository } from '../../shared/ClienteConsultaRepository.js';
import { MockOportunidadeRepository } from './adapters/persistence/MockOportunidadeRepository.js';
import { ListarOportunidadesUseCase } from './application/use-cases/ListarOportunidadesUseCase.js';
import { CriarOportunidadeUseCase } from './application/use-cases/CriarOportunidadeUseCase.js';
import { MoverOportunidadeUseCase } from './application/use-cases/MoverOportunidadeUseCase.js';
import { registrarRotasOportunidades } from './adapters/http/oportunidades.controller.js';

const escopoService = new EscopoService();
const clienteConsultaRepository = new ClienteConsultaRepository();
const oportunidadeRepository = new MockOportunidadeRepository();

registrarRotasOportunidades({
  listarOportunidadesUseCase: new ListarOportunidadesUseCase(oportunidadeRepository, clienteConsultaRepository, escopoService),
  criarOportunidadeUseCase: new CriarOportunidadeUseCase(clienteConsultaRepository, escopoService),
  moverOportunidadeUseCase: new MoverOportunidadeUseCase(oportunidadeRepository, clienteConsultaRepository, escopoService),
});
```

- [ ] **Step 6: Commit**

```bash
git add api/src/features/oportunidades api/test/oportunidades.domain.test.mjs
git commit -m "feat(oportunidades): migra para vertical slice com Clean Architecture

Entity Oportunidade com as regras de funil (RF09/RF29/RF30) isoladas e
testadas sem Mongo nem Azure Functions; 3 use cases; MockOportunidadeRepository
como adapter sobre a massa mock. Comportamento identico as 3 rotas antigas.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Slice `tarefas` (Leandro Canha, parte 2)

**Files:**
- Create: `api/src/features/tarefas/domain/Tarefa.js`
- Create: `api/src/features/tarefas/application/ports/TarefaRepository.js`
- Create: `api/src/features/tarefas/application/use-cases/ListarTarefasUseCase.js`
- Create: `api/src/features/tarefas/application/use-cases/AtualizarTarefaUseCase.js`
- Create: `api/src/features/tarefas/adapters/persistence/MockTarefaRepository.js`
- Create: `api/src/features/tarefas/adapters/http/tarefas.controller.js`
- Create: `api/src/features/tarefas/index.js`
- Test: `api/test/tarefas.domain.test.mjs`

**Interfaces:**
- Consumes: `EscopoService` e `ClienteConsultaRepository` do kernel (Task 1).
- Produces: nada consumido por outra slice.

- [ ] **Step 1: Entidade `Tarefa`**

Crie `api/src/features/tarefas/domain/Tarefa.js`:

```js
/** RF28 — "vencida" é sempre derivado da data, nunca gravado. */
export function marcarAlteracoes(atual, corpo, id) {
  const tarefa = { ...atual, ...corpo, id };
  if (tarefa.status === 'concluida') tarefa.faixa = null;
  return tarefa;
}
```

- [ ] **Step 2: Teste unitário da entidade**

Crie `api/test/tarefas.domain.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marcarAlteracoes } from '../src/features/tarefas/domain/Tarefa.js';

test('marcarAlteracoes zera a faixa ao concluir a tarefa (RF28)', () => {
  const atual = { id: 't1', status: 'pendente', faixa: 'vencida', titulo: 'Ligar' };
  const resultado = marcarAlteracoes(atual, { status: 'concluida' }, 't1');
  assert.equal(resultado.status, 'concluida');
  assert.equal(resultado.faixa, null);
  assert.equal(resultado.titulo, 'Ligar');
});

test('marcarAlteracoes preserva a faixa quando so o titulo muda', () => {
  const atual = { id: 't1', status: 'pendente', faixa: 'hoje' };
  const resultado = marcarAlteracoes(atual, { titulo: 'Ligar de novo' }, 't1');
  assert.equal(resultado.faixa, 'hoje');
});
```

- [ ] **Step 3: Rodar o teste e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node --test api/test/tarefas.domain.test.mjs`
Expected: 2 testes passando.

- [ ] **Step 4: Port + Use Cases**

Crie `api/src/features/tarefas/application/ports/TarefaRepository.js`:

```js
export class TarefaRepository {
  async listarVisiveis(idsPermitidos) {
    throw new Error('TarefaRepository.listarVisiveis não implementado');
  }

  async obterPorId(id) {
    throw new Error('TarefaRepository.obterPorId não implementado');
  }
}
```

Crie `api/src/features/tarefas/application/use-cases/ListarTarefasUseCase.js`:

```js
/** GET /api/tarefas — RF10/RF13. */
export class ListarTarefasUseCase {
  constructor(tarefaRepository, clienteConsultaRepository, escopoService) {
    this.tarefaRepository = tarefaRepository;
    this.clienteConsultaRepository = clienteConsultaRepository;
    this.escopoService = escopoService;
  }

  async executar({ usuarioId, status }) {
    const { usuario, ids } = this.escopoService.resolver(usuarioId);
    if (!usuario) return { erro: 'usuarioId não encontrado' };

    let lista = await this.tarefaRepository.listarVisiveis(ids);
    if (status) lista = lista.filter((t) => t.status === status);

    const clientes = await this.clienteConsultaRepository.listarTodos();
    const clientesPorId = new Map(clientes.map((c) => [c.id, c]));
    lista = lista
      .map((t) => ({ ...t, clienteNome: clientesPorId.get(t.clienteId)?.nome || '—' }))
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

    const porFaixa = (faixa) => lista.filter((t) => t.faixa === faixa).length;
    return {
      itens: lista,
      total: lista.length,
      resumo: {
        pendentes: lista.filter((t) => t.status === 'pendente').length,
        concluidas: lista.filter((t) => t.status === 'concluida').length,
        vencidas: porFaixa('vencida'),
        hoje: porFaixa('hoje'),
        amanha: porFaixa('amanha'),
        proximos15Dias: porFaixa('quinze'),
      },
    };
  }
}
```

Crie `api/src/features/tarefas/application/use-cases/AtualizarTarefaUseCase.js`:

```js
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
```

- [ ] **Step 5: Adapter de persistência + controller + composition root**

Crie `api/src/features/tarefas/adapters/persistence/MockTarefaRepository.js`:

```js
import { carregarDados } from '../../../../shared/dados.js';
import { TarefaRepository } from '../../application/ports/TarefaRepository.js';

export class MockTarefaRepository extends TarefaRepository {
  async listarVisiveis(idsPermitidos) {
    return carregarDados().tarefas.filter((t) => idsPermitidos.includes(t.responsavelId));
  }

  async obterPorId(id) {
    return carregarDados().tarefas.find((t) => t.id === id) || null;
  }
}
```

Crie `api/src/features/tarefas/adapters/http/tarefas.controller.js`:

```js
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
```

Crie `api/src/features/tarefas/index.js`:

```js
import { EscopoService } from '../../shared/EscopoService.js';
import { ClienteConsultaRepository } from '../../shared/ClienteConsultaRepository.js';
import { MockTarefaRepository } from './adapters/persistence/MockTarefaRepository.js';
import { ListarTarefasUseCase } from './application/use-cases/ListarTarefasUseCase.js';
import { AtualizarTarefaUseCase } from './application/use-cases/AtualizarTarefaUseCase.js';
import { registrarRotasTarefas } from './adapters/http/tarefas.controller.js';

const escopoService = new EscopoService();
const clienteConsultaRepository = new ClienteConsultaRepository();
const tarefaRepository = new MockTarefaRepository();

registrarRotasTarefas({
  listarTarefasUseCase: new ListarTarefasUseCase(tarefaRepository, clienteConsultaRepository, escopoService),
  atualizarTarefaUseCase: new AtualizarTarefaUseCase(tarefaRepository),
});
```

- [ ] **Step 6: Commit**

```bash
git add api/src/features/tarefas api/test/tarefas.domain.test.mjs
git commit -m "feat(tarefas): migra para vertical slice com Clean Architecture

Entity Tarefa com a regra RF28 isolada e testada; MockTarefaRepository como
adapter sobre a massa mock. Comportamento identico as 2 rotas antigas.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Slice `dashboard` (Pedro Costa, parte 1)

**Files:**
- Create: `api/src/features/dashboard/domain/Dashboard.js`
- Create: `api/src/features/dashboard/application/ports/ClienteStatusRepository.js`
- Create: `api/src/features/dashboard/application/ports/OportunidadeConsultaRepository.js`
- Create: `api/src/features/dashboard/application/ports/TarefaConsultaRepository.js`
- Create: `api/src/features/dashboard/application/ports/UsuarioConsultaRepository.js`
- Create: `api/src/features/dashboard/application/use-cases/ObterDashboardUseCase.js`
- Create: `api/src/features/dashboard/adapters/persistence/MongoClienteStatusRepository.js`
- Create: `api/src/features/dashboard/adapters/persistence/MockOportunidadeConsultaRepository.js`
- Create: `api/src/features/dashboard/adapters/persistence/MockTarefaConsultaRepository.js`
- Create: `api/src/features/dashboard/adapters/persistence/MockUsuarioConsultaRepository.js`
- Create: `api/src/features/dashboard/adapters/http/dashboard.controller.js`
- Create: `api/src/features/dashboard/index.js`
- Test: `api/test/dashboard.domain.test.mjs`

**Interfaces:**
- Consumes: `EscopoService` do kernel (Task 1). Define e implementa seus próprios ports de leitura para clientes/oportunidades/tarefas/usuários — nunca importa classes de dentro de `features/clientes`, `features/oportunidades` ou `features/tarefas` (as slices ficam desacopladas umas das outras).
- Produces: nada consumido por outra slice.

- [ ] **Step 1: Funções de domínio (agregação — RF19/RF29/RF31)**

Crie `api/src/features/dashboard/domain/Dashboard.js`:

```js
/** RF31 — ranking por valor ganho. O Vendedor não vê ranking. */
export function calcularRanking(usuario, ids, usuarios, ganhas, perdidas) {
  if (usuario.perfil === 'Vendedor') return [];
  return ids
    .map((id) => {
      const u = usuarios.find((x) => x.id === id);
      const minhas = ganhas.filter((o) => o.responsavelId === id);
      const minhasPerdidas = perdidas.filter((o) => o.responsavelId === id);
      return {
        usuarioId: id,
        nome: u ? u.nome : 'Sem responsável',
        perfil: u ? u.perfil : '—',
        ativo: u ? u.status === 'Ativo' : false,
        valorGanho: minhas.reduce((soma, o) => soma + o.valor, 0),
        oportunidadesGanhas: minhas.length,
        oportunidadesPerdidas: minhasPerdidas.length,
      };
    })
    .filter((r) => r.oportunidadesGanhas > 0 || r.perfil === 'Vendedor')
    .sort((a, b) => b.valorGanho - a.valorGanho);
}

/** RF19/RF29 — contagem e soma do funil por etapa, mais motivos de perda. */
export function calcularIndicadoresOportunidades(oportunidades, etapas) {
  const emAberto = oportunidades.filter((o) => o.etapa !== 'Fechado');
  const ganhas = oportunidades.filter((o) => o.resultado === 'ganho');
  const perdidas = oportunidades.filter((o) => o.resultado === 'perdido');
  return {
    total: oportunidades.length,
    valorEmNegociacao: emAberto.reduce((soma, o) => soma + o.valor, 0),
    valorGanho: ganhas.reduce((soma, o) => soma + o.valor, 0),
    ganhas: ganhas.length,
    perdidas: perdidas.length,
    porEtapa: etapas.map((etapa) => {
      const daEtapa = oportunidades.filter((o) => o.etapa === etapa);
      return {
        etapa,
        quantidade: daEtapa.length,
        valorTotal: daEtapa.reduce((soma, o) => soma + o.valor, 0),
      };
    }),
    motivosPerda: perdidas.reduce((acc, o) => {
      if (o.motivoPerda) acc[o.motivoPerda] = (acc[o.motivoPerda] || 0) + 1;
      return acc;
    }, {}),
  };
}

export function calcularIndicadoresTarefas(tarefas) {
  return {
    total: tarefas.length,
    pendentes: tarefas.filter((t) => t.status === 'pendente').length,
    concluidas: tarefas.filter((t) => t.status === 'concluida').length,
    vencidas: tarefas.filter((t) => t.faixa === 'vencida').length,
    hoje: tarefas.filter((t) => t.faixa === 'hoje').length,
    amanha: tarefas.filter((t) => t.faixa === 'amanha').length,
    proximos15Dias: tarefas.filter((t) => t.faixa === 'quinze').length,
  };
}

export function calcularIndicadoresClientes(clientes, statusPossiveis) {
  return {
    total: clientes.length,
    porStatus: Object.fromEntries(statusPossiveis.map((s) => [s, clientes.filter((c) => c.status === s).length])),
  };
}
```

- [ ] **Step 2: Teste unitário das agregações**

Crie `api/test/dashboard.domain.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularRanking, calcularIndicadoresOportunidades } from '../src/features/dashboard/domain/Dashboard.js';

test('calcularRanking nao aparece para Vendedor (RF31)', () => {
  const ranking = calcularRanking({ perfil: 'Vendedor' }, ['u1'], [], [], []);
  assert.deepEqual(ranking, []);
});

test('calcularRanking soma valor ganho por responsavel', () => {
  const usuarios = [{ id: 'u1', nome: 'Ana', perfil: 'Gerente', status: 'Ativo' }];
  const ganhas = [{ responsavelId: 'u1', valor: 100 }, { responsavelId: 'u1', valor: 50 }];
  const ranking = calcularRanking({ perfil: 'Gerente' }, ['u1'], usuarios, ganhas, []);
  assert.equal(ranking[0].valorGanho, 150);
  assert.equal(ranking[0].oportunidadesGanhas, 2);
});

test('calcularIndicadoresOportunidades soma valor em negociacao sem contar Fechado', () => {
  const oportunidades = [
    { etapa: 'Prospecção', valor: 100, resultado: null },
    { etapa: 'Fechado', valor: 200, resultado: 'ganho' },
  ];
  const indicadores = calcularIndicadoresOportunidades(oportunidades, ['Prospecção', 'Fechado']);
  assert.equal(indicadores.valorEmNegociacao, 100);
  assert.equal(indicadores.valorGanho, 200);
});
```

- [ ] **Step 3: Rodar o teste e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node --test api/test/dashboard.domain.test.mjs`
Expected: 3 testes passando.

- [ ] **Step 4: Ports próprios da slice (sem importar outra slice)**

Crie `api/src/features/dashboard/application/ports/ClienteStatusRepository.js`:

```js
export class ClienteStatusRepository {
  async listarStatusVisiveis(idsPermitidos) {
    throw new Error('ClienteStatusRepository.listarStatusVisiveis não implementado');
  }
}
```

Crie `api/src/features/dashboard/application/ports/OportunidadeConsultaRepository.js`:

```js
export class OportunidadeConsultaRepository {
  async listarVisiveis(idsPermitidos) {
    throw new Error('OportunidadeConsultaRepository.listarVisiveis não implementado');
  }
}
```

Crie `api/src/features/dashboard/application/ports/TarefaConsultaRepository.js`:

```js
export class TarefaConsultaRepository {
  async listarVisiveis(idsPermitidos) {
    throw new Error('TarefaConsultaRepository.listarVisiveis não implementado');
  }
}
```

Crie `api/src/features/dashboard/application/ports/UsuarioConsultaRepository.js`:

```js
export class UsuarioConsultaRepository {
  async listarTodos() {
    throw new Error('UsuarioConsultaRepository.listarTodos não implementado');
  }
}
```

- [ ] **Step 5: Use Case**

Crie `api/src/features/dashboard/application/use-cases/ObterDashboardUseCase.js`:

```js
import { ETAPAS, STATUS_CLIENTE } from '../../../../shared/dados.js';
import {
  calcularRanking, calcularIndicadoresOportunidades, calcularIndicadoresTarefas, calcularIndicadoresClientes,
} from '../../domain/Dashboard.js';

/** GET /api/dashboard — RF11/RF15/RF19/RF31. */
export class ObterDashboardUseCase {
  constructor(clienteStatusRepository, oportunidadeConsultaRepository, tarefaConsultaRepository, usuarioConsultaRepository, escopoService) {
    this.clienteStatusRepository = clienteStatusRepository;
    this.oportunidadeConsultaRepository = oportunidadeConsultaRepository;
    this.tarefaConsultaRepository = tarefaConsultaRepository;
    this.usuarioConsultaRepository = usuarioConsultaRepository;
    this.escopoService = escopoService;
  }

  async executar({ usuarioId }) {
    const { usuario, ids } = this.escopoService.resolver(usuarioId);
    if (!usuario) return { erro: 'usuarioId não encontrado' };

    const usuarios = await this.usuarioConsultaRepository.listarTodos();
    const clientes = await this.clienteStatusRepository.listarStatusVisiveis(ids);
    const oportunidades = await this.oportunidadeConsultaRepository.listarVisiveis(ids);
    const tarefas = await this.tarefaConsultaRepository.listarVisiveis(ids);

    const ganhas = oportunidades.filter((o) => o.resultado === 'ganho');
    const perdidas = oportunidades.filter((o) => o.resultado === 'perdido');

    return {
      escopo: {
        usuarioId: usuario.id,
        nome: usuario.nome,
        perfil: usuario.perfil,
        modoVisualizacao: usuario.modoVisualizacao,
        responsaveis: ids,
      },
      clientes: calcularIndicadoresClientes(clientes, STATUS_CLIENTE),
      oportunidades: calcularIndicadoresOportunidades(oportunidades, ETAPAS),
      tarefas: calcularIndicadoresTarefas(tarefas),
      ranking: calcularRanking(usuario, ids, usuarios, ganhas, perdidas),
    };
  }
}
```

- [ ] **Step 6: Adapters de persistência**

Crie `api/src/features/dashboard/adapters/persistence/MongoClienteStatusRepository.js`:

```js
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
```

Crie `api/src/features/dashboard/adapters/persistence/MockOportunidadeConsultaRepository.js`:

```js
import { carregarDados } from '../../../../shared/dados.js';
import { OportunidadeConsultaRepository } from '../../application/ports/OportunidadeConsultaRepository.js';

export class MockOportunidadeConsultaRepository extends OportunidadeConsultaRepository {
  async listarVisiveis(idsPermitidos) {
    return carregarDados().oportunidades.filter((o) => idsPermitidos.includes(o.responsavelId));
  }
}
```

Crie `api/src/features/dashboard/adapters/persistence/MockTarefaConsultaRepository.js`:

```js
import { carregarDados } from '../../../../shared/dados.js';
import { TarefaConsultaRepository } from '../../application/ports/TarefaConsultaRepository.js';

export class MockTarefaConsultaRepository extends TarefaConsultaRepository {
  async listarVisiveis(idsPermitidos) {
    return carregarDados().tarefas.filter((t) => idsPermitidos.includes(t.responsavelId));
  }
}
```

Crie `api/src/features/dashboard/adapters/persistence/MockUsuarioConsultaRepository.js`:

```js
import { carregarDados } from '../../../../shared/dados.js';
import { UsuarioConsultaRepository } from '../../application/ports/UsuarioConsultaRepository.js';

export class MockUsuarioConsultaRepository extends UsuarioConsultaRepository {
  async listarTodos() {
    return carregarDados().usuarios;
  }
}
```

- [ ] **Step 7: Controller + composition root**

Crie `api/src/features/dashboard/adapters/http/dashboard.controller.js`:

```js
import { app } from '@azure/functions';
import { ok, naoEncontrado, erroInterno, protegido } from '../../../../shared/http.js';
import { mongoConfigurado } from '../../../../shared/mongo.js';

export function registrarRotasDashboard({ obterDashboardUseCase }) {
  app.http('dashboard', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dashboard',
    handler: protegido(async (request) => {
      if (!mongoConfigurado()) {
        return erroInterno('MONGODB_URI não configurada: a coleção de clientes não está acessível');
      }
      const resultado = await obterDashboardUseCase.executar({ usuarioId: request.query.get('usuarioId') });
      if (resultado.erro) return naoEncontrado(resultado.erro);
      return ok(resultado);
    }),
  });
}
```

Crie `api/src/features/dashboard/index.js`:

```js
import { EscopoService } from '../../shared/EscopoService.js';
import { MongoClienteStatusRepository } from './adapters/persistence/MongoClienteStatusRepository.js';
import { MockOportunidadeConsultaRepository } from './adapters/persistence/MockOportunidadeConsultaRepository.js';
import { MockTarefaConsultaRepository } from './adapters/persistence/MockTarefaConsultaRepository.js';
import { MockUsuarioConsultaRepository } from './adapters/persistence/MockUsuarioConsultaRepository.js';
import { ObterDashboardUseCase } from './application/use-cases/ObterDashboardUseCase.js';
import { registrarRotasDashboard } from './adapters/http/dashboard.controller.js';

const escopoService = new EscopoService();

registrarRotasDashboard({
  obterDashboardUseCase: new ObterDashboardUseCase(
    new MongoClienteStatusRepository(),
    new MockOportunidadeConsultaRepository(),
    new MockTarefaConsultaRepository(),
    new MockUsuarioConsultaRepository(),
    escopoService,
  ),
});
```

- [ ] **Step 8: Commit**

```bash
git add api/src/features/dashboard api/test/dashboard.domain.test.mjs
git commit -m "feat(dashboard): migra para vertical slice com Clean Architecture

Funcoes de agregacao (ranking, indicadores por etapa/status) isoladas e
testadas sem infraestrutura. A slice define seus proprios ports de leitura
em vez de depender das classes de oportunidades/tarefas/clientes, mantendo
as slices desacopladas. Comportamento identico a rota antiga.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Slice `interacoes` (Pedro Costa, parte 2)

**Files:**
- Create: `api/src/features/interacoes/domain/Interacao.js`
- Create: `api/src/features/interacoes/application/use-cases/RegistrarInteracaoUseCase.js`
- Create: `api/src/features/interacoes/adapters/http/interacoes.controller.js`
- Create: `api/src/features/interacoes/index.js`
- Test: `api/test/interacoes.domain.test.mjs`

**Interfaces:**
- Consumes: `ClienteConsultaRepository` do kernel (Task 1), `idGeradoNaSessao` de `shared/dados.js`.
- Produces: nada consumido por outra slice.

- [ ] **Step 1: Entidade `Interacao`**

Crie `api/src/features/interacoes/domain/Interacao.js`:

```js
export const ICONES = { 'Ligação': 'phone', 'E-mail': 'mail', 'Reunião': 'meeting' };
export const CORES = { 'Ligação': 'signal', 'E-mail': 'violet', 'Reunião': 'amber' };

/** RF05 — registra ligação, e-mail ou reunião com data e observação. */
export function criarInteracao({ clienteId, tipo, obs, data, autorId }, responsavelDoCliente, gerarId) {
  const tipoLimpo = tipo.trim();
  return {
    id: gerarId('i'),
    clienteId,
    tipo: tipoLimpo,
    icon: ICONES[tipoLimpo],
    cor: CORES[tipoLimpo],
    obs: obs.trim(),
    data: data || new Date().toISOString().slice(0, 10),
    autorId: autorId || responsavelDoCliente || null,
  };
}
```

- [ ] **Step 2: Teste unitário da entidade**

Crie `api/test/interacoes.domain.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarInteracao } from '../src/features/interacoes/domain/Interacao.js';

test('criarInteracao resolve icone e cor pelo tipo', () => {
  const gerarId = (prefixo) => `${prefixo}_teste`;
  const interacao = criarInteracao({ clienteId: 'c1', tipo: 'Ligação', obs: 'Retornou a ligação' }, 'u1', gerarId);
  assert.equal(interacao.icon, 'phone');
  assert.equal(interacao.cor, 'signal');
  assert.equal(interacao.autorId, 'u1');
});

test('criarInteracao usa autorId explicito quando informado', () => {
  const gerarId = (prefixo) => `${prefixo}_teste`;
  const interacao = criarInteracao({ clienteId: 'c1', tipo: 'E-mail', obs: 'Enviou proposta', autorId: 'u2' }, 'u1', gerarId);
  assert.equal(interacao.autorId, 'u2');
});
```

- [ ] **Step 3: Rodar o teste e confirmar que passa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node --test api/test/interacoes.domain.test.mjs`
Expected: 2 testes passando.

- [ ] **Step 4: Use Case**

Crie `api/src/features/interacoes/application/use-cases/RegistrarInteracaoUseCase.js`:

```js
import { validarInteracao } from '../../../../shared/validacao.js';
import { novoId } from '../../../../shared/http.js';
import { idGeradoNaSessao } from '../../../../shared/dados.js';
import { criarInteracao } from '../../domain/Interacao.js';

export class RegistrarInteracaoUseCase {
  constructor(clienteConsultaRepository) {
    this.clienteConsultaRepository = clienteConsultaRepository;
  }

  async executar(clienteId, corpo) {
    const cliente = await this.clienteConsultaRepository.obterPorId(clienteId);
    if (!cliente && !idGeradoNaSessao(clienteId, 'c')) {
      return { naoEncontrado: `Cliente ${clienteId} não encontrado` };
    }

    const erros = validarInteracao(corpo);
    if (erros.length) return { erros };

    return { interacao: criarInteracao({ ...corpo, clienteId }, cliente?.responsavelId, novoId) };
  }
}
```

- [ ] **Step 5: Controller + composition root**

Crie `api/src/features/interacoes/adapters/http/interacoes.controller.js`:

```js
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
```

Crie `api/src/features/interacoes/index.js`:

```js
import { ClienteConsultaRepository } from '../../shared/ClienteConsultaRepository.js';
import { RegistrarInteracaoUseCase } from './application/use-cases/RegistrarInteracaoUseCase.js';
import { registrarRotasInteracoes } from './adapters/http/interacoes.controller.js';

const clienteConsultaRepository = new ClienteConsultaRepository();

registrarRotasInteracoes({
  registrarInteracaoUseCase: new RegistrarInteracaoUseCase(clienteConsultaRepository),
});
```

- [ ] **Step 6: Commit**

```bash
git add api/src/features/interacoes api/test/interacoes.domain.test.mjs
git commit -m "feat(interacoes): migra para vertical slice com Clean Architecture

Entity Interacao resolve icone/cor/autor isolada de HTTP; RegistrarInteracaoUseCase
depende so do ClienteConsultaRepository do kernel. Comportamento identico a
rota antiga.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Integração final — entry points, limpeza e regressão completa

**Files:**
- Modify: `api/package.json`
- Modify: `api/scripts/servidor-local.mjs`
- Modify: `api/scripts/testar-api.mjs`
- Delete: `api/src/functions/clientes.js`, `api/src/functions/dashboard.js`, `api/src/functions/health.js`, `api/src/functions/interacoes.js`, `api/src/functions/oportunidades.js`, `api/src/functions/tarefas.js`, `api/src/functions/usuarios.js`

**Interfaces:**
- Consumes: os 7 `index.js` das slices criadas nas Tasks 2–7.

- [ ] **Step 1: Apontar o entry point do Azure Functions para as slices**

Em `api/package.json`, troque o campo `main`:

```json
  "main": [
    "src/features/health/index.js",
    "src/features/usuarios/index.js",
    "src/features/dashboard/index.js",
    "src/features/clientes/index.js",
    "src/features/interacoes/index.js",
    "src/features/oportunidades/index.js",
    "src/features/tarefas/index.js"
  ],
```

(Lista explícita em vez de glob — evita qualquer ambiguidade de qual arquivo o host do Azure Functions carrega.)

- [ ] **Step 2: Atualizar `servidor-local.mjs`**

Em `api/scripts/servidor-local.mjs`, troque os 7 `await import(...)`:

```js
await import('../src/features/health/index.js');
await import('../src/features/usuarios/index.js');
await import('../src/features/dashboard/index.js');
await import('../src/features/clientes/index.js');
await import('../src/features/interacoes/index.js');
await import('../src/features/oportunidades/index.js');
await import('../src/features/tarefas/index.js');
```

Nada mais no arquivo muda — ele intercepta `app.http` antes do import, igual antes.

- [ ] **Step 3: Atualizar `testar-api.mjs`**

Em `api/scripts/testar-api.mjs`, troque os mesmos 7 imports pelos novos caminhos (igual ao Step 2). Nenhuma outra linha do arquivo muda — os 30 casos de teste continuam os mesmos.

- [ ] **Step 4: Rodar a suíte de regressão completa**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node api/scripts/testar-api.mjs`
Expected: os 30 casos passando (saída final do tipo `30/30 passaram`, sem nenhum `FALHOU`).

Se algum caso falhar, compare a resposta da rota nova com o `git show HEAD~8:api/src/functions/<arquivo>.js` correspondente (o conteúdo antes da migração) para achar a diferença — não altere o script de teste para "passar".

- [ ] **Step 5: Rodar os testes unitários de domínio das 7 slices**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node --test api/test/*.test.mjs`
Expected: todos os testes das Tasks 1–7 passando (17 testes ao todo).

- [ ] **Step 6: Subir o servidor local e conferir uma rota de cada slice manualmente**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && node api/scripts/servidor-local.mjs &`
Run: `curl -s "http://localhost:7071/api/health" | head -c 300`
Run: `curl -s "http://localhost:7071/api/clientes?usuarioId=u2&q=acme" | head -c 300`
Expected: respostas JSON válidas, no mesmo formato documentado no `README.md`. Encerre o servidor depois (`kill %1` ou `pkill -f servidor-local.mjs`).

- [ ] **Step 7: Remover os arquivos antigos**

```bash
git rm api/src/functions/clientes.js api/src/functions/dashboard.js api/src/functions/health.js \
       api/src/functions/interacoes.js api/src/functions/oportunidades.js api/src/functions/tarefas.js \
       api/src/functions/usuarios.js
rmdir api/src/functions 2>/dev/null || true
```

- [ ] **Step 8: Atualizar a seção "Como o projeto está organizado" do `README.md`**

No `README.md`, na árvore de diretórios do `api/`, troque:

```
├── api/                      Azure Functions (Node v4, ESM)
│   ├── src/functions/        as 14 rotas
│   ├── src/shared/           dados, escopo por perfil, validação, HTTP, MongoDB
│   ├── src/data/             massa mock gerada
│   └── scripts/              gerador, carga no MongoDB, testes e servidor local
```

por:

```
├── api/                      Azure Functions (Node v4, ESM)
│   ├── src/features/         as 14 rotas, uma vertical slice por área
│   │                         (domain/application/adapters + index.js)
│   ├── src/shared/           kernel compartilhado: dados, escopo por perfil,
│   │                         validação, HTTP, MongoDB
│   ├── src/data/             massa mock gerada
│   ├── test/                 testes unitários dos módulos de domínio
│   └── scripts/              gerador, carga no MongoDB, testes e servidor local
```

- [ ] **Step 9: Commit**

```bash
git add api/package.json api/scripts/servidor-local.mjs api/scripts/testar-api.mjs README.md
git commit -m "refactor(api): aponta os entry points para as vertical slices e remove functions/

Os 30 casos de testar-api.mjs continuam passando sem alteracao no proprio
script, confirmando que a reorganizacao nao mudou nenhum comportamento
observavel da API.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Diagramas de classes e componentes (Mermaid + PNG)

**Files:**
- Create: `docs/entrega/diagramas/componentes-backend.md`
- Create: `docs/entrega/diagramas/componentes-backend.png`
- Create: `docs/entrega/diagramas/classes-clientes.md`
- Create: `docs/entrega/diagramas/classes-clientes.png`
- Create: `docs/entrega/diagramas/classes-demais-slices.md`
- Create: `docs/entrega/diagramas/classes-demais-slices.png`

**Interfaces:**
- Consumes: nenhuma — os diagramas descrevem o código das Tasks 1–8.

- [ ] **Step 1: Diagrama de componentes do backend**

Crie `docs/entrega/diagramas/componentes-backend.md` com um diagrama Mermaid
`graph TB`, com 7 subgráficos (um por slice) mostrando as camadas
`adapters/http` → `application` → `domain`, mais `adapters/persistence`
implementando `application`, e um subgráfico `Kernel` com os arquivos de
`shared/`, com setas de cada slice apontando para os arquivos do kernel que
ela usa.

- [ ] **Step 2: Diagrama de classes da slice `clientes`**

Crie `docs/entrega/diagramas/classes-clientes.md` com um `classDiagram`
Mermaid: entidade `Cliente`, interfaces `ClienteRepository` e
`HistoricoClienteRepository` (`<<interface>>`), suas implementações
(`MongoClienteRepository`, `MockHistoricoClienteRepository`), os 5 use
cases e o `ClientesController`, com as setas de dependência (`..|>` para
implementação, `-->` para uso).

- [ ] **Step 3: Diagrama de classes resumido das demais slices**

Crie `docs/entrega/diagramas/classes-demais-slices.md` com a mesma notação,
cobrindo oportunidades, tarefas, dashboard, interações, usuários e health
em menos detalhe, para fechar a cobertura do diagrama de classes do
backend inteiro.

- [ ] **Step 4: Exportar os 3 diagramas para PNG**

```bash
source ~/.nvm/nvm.sh && nvm use 22
cd docs/entrega/diagramas
npx -y @mermaid-js/mermaid-cli -i componentes-backend.md -o componentes-backend.png -b white --size 1800
npx -y @mermaid-js/mermaid-cli -i classes-clientes.md -o classes-clientes.png -b white --size 1800
npx -y @mermaid-js/mermaid-cli -i classes-demais-slices.md -o classes-demais-slices.png -b white --size 1800
cd -
```

O modo Markdown do `mermaid-cli` gera os arquivos com sufixo `-1`
(`componentes-backend-1.png`); renomeie para o nome sem sufixo.

Expected: 3 arquivos `.png` gerados em `docs/entrega/diagramas/`, cada um com o diagrama legível (abra com o visualizador de imagem padrão para conferir antes de seguir).

Se `mermaid-cli` falhar neste ambiente (ex.: sem acesso ao Chromium headless), alternativa: abrir cada `.md` numa aba do Browser pane com o script do Mermaid (`https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js`) carregado numa página HTML local, e tirar um `zoom`/screenshot da área do diagrama, salvando como PNG.

- [ ] **Step 5: Commit**

```bash
git add docs/entrega/diagramas
git commit -m "docs: adiciona diagramas de componentes e classes do backend

Mermaid (markdown) + PNG exportado, cobrindo as 7 vertical slices e o
kernel compartilhado, conforme pedido na entrega do TDE 2.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: PDF final da entrega

**Files:**
- Modify: `PROMPT.MD`
- Create: `docs/entrega/entrega-tde2.html`
- Create: `docs/entrega/entrega-tde2.pdf`

**Interfaces:**
- Consumes: `GRUPO.md` (nomes dos 4 alunos), os 3 diagramas da Task 9, o resultado da Task 8 (30/30 testes).

- [ ] **Step 1: Acrescentar ao `PROMPT.MD` a seção desta refatoração**

No final de `PROMPT.MD` (depois da seção "O que deu errado no caminho"), adicione uma nova seção `## Prompt 6: Vertical Slice, Clean Architecture e SOLID no backend` com os prompts humanizados de cada aluno, no mesmo tom informal e com pequenos erros de digitação que o resto do arquivo já usa (sem inventar fatos — descrever o pedido real de cada parte da Task 2 a 7 deste plano), seguindo a estrutura por aluno (Nicolas/clientes, Leandro/oportunidades+tarefas, Pedro/dashboard+interacoes, Lincoln/usuarios+health+kernel) e fechando com uma tabela "Como dividimos o trabalho desta vez" e uma nota sobre o trade-off de verbosidade dos padrões e a pendência de rodar `testar-api.mjs` com credenciais reais do MongoDB Atlas.

- [ ] **Step 2: Montar o HTML do relatório**

Crie `docs/entrega/entrega-tde2.html` com: capa (título, disciplina, link do
GitHub na branch `vertical-slice/clean-architeture`, data), os 4 nomes do
`GRUPO.md`, um resumo de uma página de Vertical Slice/Clean
Architecture/SOLID (baseado no conteúdo extraído dos 3 slides do
professor), uma seção por aluno (reaproveitando o texto do Step 1), e os 3
diagramas da Task 9 embutidos via `<img src="diagramas/....png">`. Use CSS
simples embutido (sem dependência externa, já que o PDF sai por
impressão local do Chrome) — fonte legível, margens de impressão, quebra de
página (`page-break-before: always`) antes de cada seção de aluno e antes
dos diagramas.

- [ ] **Step 3: Gerar o PDF a partir do HTML**

```bash
google-chrome --headless --disable-gpu --no-sandbox \
  --print-to-pdf="$(pwd)/docs/entrega/entrega-tde2.pdf" \
  --no-pdf-header-footer \
  "file://$(pwd)/docs/entrega/entrega-tde2.html"
```

Expected: `docs/entrega/entrega-tde2.pdf` criado. Renderize as páginas com
`pdftoppm -png -r 100 docs/entrega/entrega-tde2.pdf /tmp/preview` e confira
visualmente que os 4 nomes, o link do GitHub, os prompts e os 3 diagramas
aparecem legíveis — página cortada ou imagem sem carregar (caminho
relativo errado) é o erro mais comum aqui; se acontecer, use caminho
absoluto `file://` para as imagens no HTML e gere de novo.

- [ ] **Step 4: Commit**

```bash
git add PROMPT.MD docs/entrega/entrega-tde2.html docs/entrega/entrega-tde2.pdf
git commit -m "docs: gera o PDF de entrega do TDE 2 com prompts e diagramas por aluno

Adiciona a secao 6 do PROMPT.MD (vertical slice/clean architecture/SOLID,
dividida por aluno) e monta o PDF final a partir do HTML com os diagramas
embutidos.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Avisar o usuário sobre o push**

Não faça `git push`. Diga ao usuário que a branch `vertical-slice/clean-architeture`
está pronta localmente com todos os commits das Tasks 1–10, e pergunte se
deve dar push para o GitHub agora.
