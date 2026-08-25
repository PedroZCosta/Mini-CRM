import { app } from '@azure/functions';
import { carregarDados, idGeradoNaSessao } from '../shared/dados.js';
import { criado, requisicaoInvalida, naoEncontrado, lerCorpo, novoId } from '../shared/http.js';
import { validarInteracao } from '../shared/validacao.js';

const ICONES = { 'Ligação': 'phone', 'E-mail': 'mail', 'Reunião': 'meeting' };
const CORES = { 'Ligação': 'signal', 'E-mail': 'violet', 'Reunião': 'amber' };

/**
 * POST /api/clientes/{id}/interacoes — RF05.
 * Registra ligação, e-mail ou reunião com data e observação no cliente.
 */
app.http('interacoes-criar', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'clientes/{id}/interacoes',
  handler: async (request) => {
    const { id } = request.params;
    const cliente = carregarDados().clientes.find((c) => c.id === id);
    if (!cliente && !idGeradoNaSessao(id, 'c')) {
      return naoEncontrado(`Cliente ${id} não encontrado`);
    }

    const corpo = await lerCorpo(request);
    if (!corpo) return requisicaoInvalida('Envie um corpo JSON com tipo e observação');

    const erros = validarInteracao(corpo);
    if (erros.length) return requisicaoInvalida('Interação inválida', erros);

    const tipo = corpo.tipo.trim();
    return criado({
      id: novoId('i'),
      clienteId: id,
      tipo,
      icon: ICONES[tipo],
      cor: CORES[tipo],
      obs: corpo.obs.trim(),
      data: corpo.data || new Date().toISOString().slice(0, 10),
      autorId: corpo.autorId || cliente?.responsavelId || null,
    });
  },
});
