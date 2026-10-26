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
