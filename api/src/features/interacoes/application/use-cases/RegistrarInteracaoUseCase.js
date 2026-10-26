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
