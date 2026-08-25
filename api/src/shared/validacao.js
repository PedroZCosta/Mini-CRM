/**
 * Validação dos corpos de escrita.
 *
 * As Functions não persistem: validam o payload, aplicam as regras de negócio
 * dos requisitos e devolvem o registro resultante, que o front-end guarda no
 * estado da aplicação. Erro de validação vira 400 com a lista de problemas.
 */
import {
  ETAPAS, STATUS_CLIENTE, TIPOS_INTERACAO, MOTIVOS_PERDA, carregarDados, idGeradoNaSessao,
} from './dados.js';

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** RF03 — nome, e-mail e responsável são obrigatórios no cadastro de cliente. */
export function validarCliente(corpo, { parcial = false } = {}) {
  const erros = [];
  const { usuarios } = carregarDados();
  const tem = (campo) => corpo[campo] !== undefined;

  if (!parcial || tem('nome')) {
    if (texto(corpo.nome).length < 3) erros.push('nome: informe ao menos 3 caracteres');
  }
  if (!parcial || tem('email')) {
    if (!EMAIL.test(texto(corpo.email))) erros.push('email: formato inválido');
  }
  if (!parcial || tem('empresa')) {
    if (texto(corpo.empresa).length < 2) erros.push('empresa: informe ao menos 2 caracteres');
  }
  if (!parcial || tem('responsavelId')) {
    const resp = usuarios.find((u) => u.id === corpo.responsavelId);
    if (!resp) erros.push('responsavelId: usuário inexistente');
  }
  if (tem('status') && !STATUS_CLIENTE.includes(corpo.status)) {
    erros.push(`status: use um de ${STATUS_CLIENTE.join(', ')}`);
  }
  return erros;
}

/** RF05 — interação exige tipo válido e observação. */
export function validarInteracao(corpo) {
  const erros = [];
  if (!TIPOS_INTERACAO.includes(texto(corpo.tipo))) {
    erros.push(`tipo: use um de ${TIPOS_INTERACAO.join(', ')}`);
  }
  if (texto(corpo.obs).length < 3) erros.push('obs: descreva a interação com ao menos 3 caracteres');
  return erros;
}

/** RF07 — oportunidade exige cliente, título e valor positivo. */
export function validarOportunidade(corpo) {
  const erros = [];
  const { clientes } = carregarDados();
  const clienteExiste = clientes.some((c) => c.id === corpo.clienteId)
    || idGeradoNaSessao(corpo.clienteId, 'c');
  if (!clienteExiste) erros.push('clienteId: cliente inexistente');
  if (texto(corpo.titulo).length < 3) erros.push('titulo: informe ao menos 3 caracteres');
  if (!(Number(corpo.valor) > 0)) erros.push('valor: informe um valor estimado maior que zero');
  if (corpo.etapa !== undefined && !ETAPAS.includes(corpo.etapa)) {
    erros.push(`etapa: use uma de ${ETAPAS.join(', ')}`);
  }
  return erros;
}

/**
 * RF09/RF29 — movimentação no funil.
 * Fechar como perdido exige motivo da lista fixa; tirar uma oportunidade já
 * fechada do fim do funil exige reabertura explícita.
 */
export function validarMovimentacao(corpo, atual) {
  const erros = [];
  const etapa = corpo.etapa;

  if (!ETAPAS.includes(etapa)) {
    erros.push(`etapa: use uma de ${ETAPAS.join(', ')}`);
    return erros;
  }
  if (etapa === 'Fechado') {
    if (!['ganho', 'perdido'].includes(corpo.resultado)) {
      erros.push('resultado: informe ganho ou perdido ao fechar a oportunidade');
    }
    if (corpo.resultado === 'perdido' && !MOTIVOS_PERDA.includes(corpo.motivoPerda)) {
      erros.push(`motivoPerda: obrigatório ao perder, use um de ${MOTIVOS_PERDA.join(', ')}`);
    }
  }
  if (atual && atual.etapa === 'Fechado' && etapa !== 'Fechado' && corpo.reabrir !== true) {
    erros.push('reabrir: oportunidade fechada exige reabertura explícita (envie reabrir: true)');
  }
  return erros;
}

/** RF28 — só "concluida" e "pendente" são estados persistidos da tarefa. */
export function validarTarefa(corpo) {
  const erros = [];
  if (corpo.status !== undefined && !['pendente', 'concluida'].includes(corpo.status)) {
    erros.push('status: use pendente ou concluida');
  }
  if (corpo.titulo !== undefined && texto(corpo.titulo).length < 3) {
    erros.push('titulo: informe ao menos 3 caracteres');
  }
  return erros;
}
