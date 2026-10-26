# Diagrama de classes — slice `clientes`

A slice mais completa: 5 use cases (SRP), um port (`ClienteRepository`)
implementado por um adapter real (`MongoClienteRepository`) — Dependency
Inversion visível: os use cases dependem da interface, nunca da
implementação concreta.

```mermaid
classDiagram
  class Cliente {
    +id: string
    +nome: string
    +empresa: string
    +email: string
    +status: string
    +responsavelId: string
    +excluido: boolean
  }

  class ClienteRepository {
    <<interface>>
    +buscarPaginado(criterios, paginacao)
    +obterPorId(id)
    +inserir(cliente)
    +atualizar(id, alteracoes)
    +aplicarExclusaoLogica(id)
  }

  class MongoClienteRepository {
    +buscarPaginado(criterios, paginacao)
    +obterPorId(id)
    +inserir(cliente)
    +atualizar(id, alteracoes)
    +aplicarExclusaoLogica(id)
  }

  class HistoricoClienteRepository {
    <<interface>>
    +obterHistorico(clienteId, ids)
  }

  class MockHistoricoClienteRepository {
    +obterHistorico(clienteId, ids)
  }

  class ListarClientesUseCase {
    -clienteRepository: ClienteRepository
    -escopoService: EscopoService
    +executar(filtros)
  }
  class ObterClienteUseCase {
    -clienteRepository: ClienteRepository
    -historicoClienteRepository: HistoricoClienteRepository
    -escopoService: EscopoService
    +executar(usuarioId, id)
  }
  class CriarClienteUseCase {
    -clienteRepository: ClienteRepository
    +executar(corpo)
  }
  class AtualizarClienteUseCase {
    -clienteRepository: ClienteRepository
    +executar(id, corpo)
  }
  class ExcluirClienteUseCase {
    -clienteRepository: ClienteRepository
    +executar(id)
  }

  class ClientesController {
    +registrarRotasClientes(useCases)
  }

  class EscopoService {
    +resolver(usuarioId)
    +nomeResponsavel(id)
  }

  MongoClienteRepository ..|> ClienteRepository
  MockHistoricoClienteRepository ..|> HistoricoClienteRepository
  ListarClientesUseCase --> ClienteRepository
  ListarClientesUseCase --> EscopoService
  ObterClienteUseCase --> ClienteRepository
  ObterClienteUseCase --> HistoricoClienteRepository
  CriarClienteUseCase --> ClienteRepository
  AtualizarClienteUseCase --> ClienteRepository
  ExcluirClienteUseCase --> ClienteRepository
  ClientesController --> ListarClientesUseCase
  ClientesController --> ObterClienteUseCase
  ClientesController --> CriarClienteUseCase
  ClientesController --> AtualizarClienteUseCase
  ClientesController --> ExcluirClienteUseCase
  ListarClientesUseCase ..> Cliente
  CriarClienteUseCase ..> Cliente
```
