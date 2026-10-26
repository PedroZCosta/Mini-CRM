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
