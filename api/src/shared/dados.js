/**
 * Carrega a massa mock e converte os offsets em datas reais.
 *
 * O JSON guarda deslocamentos em dias (`*OffsetDias`) em vez de datas fixas.
 * Aqui eles viram datas ISO a partir do dia da requisição, então as faixas de
 * vencimento do RF13 continuam corretas em qualquer data de apresentação.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIA_MS = 86400000;
const CAMINHO = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'mock-data.json');
const BRUTO = JSON.parse(readFileSync(CAMINHO, 'utf8'));

let cache = null;

function hojeUTC() {
  const agora = new Date();
  return Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate());
}

function dataDeOffset(baseMs, offsetDias) {
  return new Date(baseMs + offsetDias * DIA_MS).toISOString().slice(0, 10);
}

/** RF13/RF24 — faixa de vencimento derivada do offset. Só tarefa pendente tem faixa. */
function faixaDaTarefa(tarefa) {
  if (tarefa.status === 'concluida') return null;
  const d = tarefa.vencimentoOffsetDias;
  if (d < 0) return 'vencida';
  if (d === 0) return 'hoje';
  if (d === 1) return 'amanha';
  if (d <= 15) return 'quinze';
  return null;
}

/** Dados prontos para resposta. Recalculado quando o dia vira. */
export function carregarDados() {
  const base = hojeUTC();
  if (cache && cache.base === base) return cache.dados;

  const dados = {
    referencia: new Date(base).toISOString().slice(0, 10),
    usuarios: BRUTO.usuarios.map((u) => ({ ...u })),
    clientes: BRUTO.clientes.map((c) => ({ ...c })),
    interacoes: BRUTO.interacoes.map(({ offsetDias, ...i }) => ({
      ...i,
      data: dataDeOffset(base, offsetDias),
    })),
    oportunidades: BRUTO.oportunidades.map(({ dataPrevistaOffsetDias, atualizadaOffsetDias, ...o }) => ({
      ...o,
      dataPrevista: dataDeOffset(base, dataPrevistaOffsetDias),
      atualizada: dataDeOffset(base, atualizadaOffsetDias),
    })),
    tarefas: BRUTO.tarefas.map(({ vencimentoOffsetDias, ...t }) => ({
      ...t,
      vencimento: dataDeOffset(base, vencimentoOffsetDias),
      faixa: faixaDaTarefa({ ...t, vencimentoOffsetDias }),
    })),
  };

  cache = { base, dados };
  return dados;
}

/**
 * Ids criados nesta sessão.
 *
 * A API é sem estado: um cliente cadastrado agora existe só no front-end. Como
 * o id gerado no POST tem forma própria (prefixo + underline), as rotas de
 * escrita aceitam esses ids como legítimos, em vez de responder 404 e travar o
 * fluxo de cadastrar e usar o registro em seguida.
 */
export function idGeradoNaSessao(id, prefixo) {
  return new RegExp(`^${prefixo}_[a-z0-9]{4,}$`).test(String(id || ''));
}

export const ETAPAS = ['Prospecção', 'Contato', 'Proposta', 'Fechado'];
export const STATUS_CLIENTE = ['Prospect', 'Ativo', 'Inativo'];
export const TIPOS_INTERACAO = ['Ligação', 'E-mail', 'Reunião'];
export const MOTIVOS_PERDA = ['Preço', 'Concorrente', 'Sem verba', 'Sem resposta']; // RF29
