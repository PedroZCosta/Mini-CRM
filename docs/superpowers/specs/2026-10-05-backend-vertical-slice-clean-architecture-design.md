# Refatoração do backend: Vertical Slice + Clean Architecture + SOLID

Data: 2026-10-05
Branch: `vertical-slice/clean-architeture`

## Contexto

Entrega acadêmica (TDE 2) pede para aplicar Vertical Slice Architecture,
Clean Architecture e SOLID no backend do Mini CRM (Azure Functions, Node v4
ESM), seguindo o conteúdo dos slides do professor (`VERTICAL SLICE.pptx`,
`SOLID - Repaired.pptx`, `Clean Architecture.pptx`). O backend hoje tem ~1000
linhas em 7 grupos de rotas (`clientes`, `dashboard`, `health`, `interacoes`,
`oportunidades`, `tarefas`, `usuarios`), organizados por tipo técnico
(`functions/` + `shared/`), sem separação de camadas.

A entrega também exige um PDF com: autoria dividida entre 4 alunos (Nicolas
Tancon, Leandro Canha, Pedro Costa, Lincoln Neto), link do GitHub numa nova
branch, todos os prompts usados, e diagramas de classes/componentes do
backend (markdown + imagem).

## Decisões confirmadas com o usuário

- Escopo: **todas as 7 áreas de rotas** viram vertical slices completas.
- Comportamento da API **idêntico** ao atual — refatoração pura de estrutura.
  Os 30 casos de `api/scripts/testar-api.mjs` são o critério de regressão.
- Divisão do trabalho entre os 4 alunos por peso de regra de negócio (tabela
  abaixo).
- Diagramas em **Mermaid** (markdown + PNG exportado).
- Entrega: PDF final + fontes versionadas em `docs/entrega/` no repo.
- Branch: a atual (`vertical-slice/clean-architeture`) já tem o nome certo;
  não cria outra.

## Mapeamento de camadas (terminologia do professor)

Tradução dos conceitos de Clean Architecture (Entities → Use Cases →
Interface Adapters → Frameworks & Drivers) e SOLID (SRP/OCP/LSP/ISP/DIP) para
Node.js/Azure Functions, organizados por slice (Vertical Slice):

```
api/src/features/<feature>/
  domain/              Entities: regra de negócio pura, zero dependência de
                        Azure Functions, Mongo ou HTTP.
  application/
    ports/              Interfaces dos repositórios (contrato, DIP) — classe
                        com métodos que lançam "não implementado", documentando
                        o contrato que todo adapter de saída deve cumprir.
    use-cases/           Um Use Case por operação (ListarClientesUseCase,
                        CriarClienteUseCase, ...), SRP: cada um faz uma coisa.
                        Recebe o port como dependência via construtor (DIP).
  adapters/
    http/                Interface Adapter de entrada: o handler do Azure
                        Functions (`app.http(...)`) traduz request → chamada
                        do use case → resposta HTTP. Não contém regra de
                        negócio.
    persistence/          Interface Adapter de saída: implementação concreta
                        do port (Mongo real ou InMemory sobre a massa mock).
                        Troca de um por outro sem alterar use case (LSP/OCP).
  index.js              Composition root da slice: instancia o adapter de
                        persistência concreto e injeta no use case.
```

`api/src/shared/` passa a ser o **kernel compartilhado** (o que os slides de
Vertical Slice chamam de "shared mínimo"): infraestrutura e serviço de
domínio usados por mais de uma slice.

- `shared/http.js` — protocolo de resposta (`ok`, `criado`, `requisicaoInvalida`,
  etc.) e leitura de corpo. Equivale a "Frameworks & Drivers" do lado HTTP.
- `shared/mongo.js` — bootstrap do driver MongoDB. "Frameworks & Drivers" do
  lado de persistência.
- `shared/escopo.js` / `EscopoService.js` — regra RF15 (visibilidade por
  perfil: Vendedor/Gerente/Administrador). É regra de negócio, mas atravessa
  várias slices (clientes, oportunidades, tarefas, dashboard), então fica
  como serviço de domínio compartilhado — cada use case que precisa dela a
  recebe como dependência, igual a qualquer outro port.
- `shared/validacao.js` — validadores de entidade reaproveitados pelos use
  cases de escrita.

Nenhuma dessas mudanças altera rota, contrato JSON ou regra de negócio
visível — é reorganização interna.

## Divisão por aluno

| Aluno | Slices | Justificativa |
|---|---|---|
| Nicolas Tancon | `clientes` | Maior slice (CRUD completo, único contra MongoDB real), RF03/RF04/RF06/RF16/RF18/RF26/RF28/RF30/RF33 |
| Leandro Canha | `oportunidades`, `tarefas` | Regras de funil (RF07/RF08/RF09/RF29) e vencimento calculado (RF13) |
| Pedro Costa | `dashboard`, `interacoes` | Agregação read-model (RF11/RF13/RF15/RF19/RF29/RF31) e histórico do cliente (RF05) |
| Lincoln Neto | `usuarios`, `health`, kernel compartilhado (`shared/`) | Slices simples + infraestrutura usada por todas as outras (base arquitetural) |

Cada aluno "fez" a sua(s) slice(s) nos prompts humanizados do PDF — a conversa
real (com erros de digitação, idas e vindas) descrevendo o que foi pedido
para aquela parte.

## Diagramas

Em `docs/entrega/diagramas/`, fonte Mermaid (`.md`) + imagem exportada
(`.png`):

1. **Componentes do backend** (`componentes-backend.md` /
   `.png`): as 7 slices como subgrafos, cada uma com suas 3 camadas
   internas (domain/application/adapters), o kernel compartilhado na base,
   e setas mostrando a Dependency Rule (adapters → application → domain;
   nada do kernel aponta para uma slice específica).
2. **Classes da slice `clientes`** (`classes-clientes.md` / `.png`): a
   slice mais completa — `Cliente` (entity), `ClienteRepository` (port),
   os 5 use cases, `MongoClienteRepository` (adapter), e o controller HTTP —
   com as setas de dependência explícitas (DIP visível: use case depende da
   interface, adapter implementa a interface).
3. Diagrama resumido de classes cobrindo as demais slices em um único
   diagrama (mesma notação, menos detalhe), para fechar a cobertura do
   "diagrama de classes do backend" pedido no enunciado.

## PDF final (`docs/entrega/entrega-tde2.pdf`)

Seções:
1. Capa + integrantes (`GRUPO.md` já tem os 4 nomes).
2. Link do GitHub (branch `vertical-slice/clean-architeture`).
3. Introdução: o que é Vertical Slice / Clean Architecture / SOLID, resumida
   dos slides do professor, como pano de fundo teórico.
4. Uma seção por aluno: a slice que ele implementou, decisões de design
   (qual princípio SOLID apareceu onde), e os prompts humanizados dessa
   parte (seguindo o tom informal e com pequenos erros de digitação que o
   `PROMPT.MD` do grupo já usa, para manter consistência de estilo).
5. Diagramas de classes e componentes (embutidos como imagem).

`PROMPT.MD` na raiz é atualizado com uma seção nova cobrindo esta
refatoração (mantendo as entradas antigas), e o PDF reusa esse conteúdo.

## Verificação

- `node api/scripts/testar-api.mjs` continua com os 30 casos passando, sem
  nenhuma alteração no próprio script de teste.
- `node api/scripts/servidor-local.mjs` sobe sem erro e as rotas respondem
  no mesmo formato de antes.
- Nenhum arquivo em `api/src/functions/` ou `api/src/shared/` antigo
  permanece — tudo migra para `api/src/features/` e o novo `api/src/shared/`
  (kernel). Imports em `scripts/servidor-local.mjs` (se houver referência
  direta aos arquivos antigos) são atualizados.

## Fora de escopo

- Nenhuma mudança no front-end (`app/`).
- Nenhuma mudança de comportamento, performance ou nova funcionalidade.
- Não cria conta nem faz push para o GitHub sem confirmação explícita do
  usuário.
