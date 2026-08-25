import { Icone } from './Icone';
import { FAIXAS } from '../util/formato';
import type { Etapa, FaixaVencimento, Perfil, ResultadoOportunidade, StatusCliente } from '../tipos';

const CLASSE_STATUS: Record<string, string> = {
  Ativo: 'badge-green',
  Prospect: 'badge-amber',
  Inativo: 'badge-slate',
  Desativado: 'badge-slate',
};

/** RF30 — Prospect, Ativo ou Inativo. */
export function BadgeStatus({ status }: { status: StatusCliente | string }) {
  return <span className={`badge ${CLASSE_STATUS[status] || 'badge-slate'}`}>{status}</span>;
}

const CLASSE_PERFIL: Record<Perfil, string> = {
  Admin: 'badge-violet',
  Gerente: 'badge-signal',
  Vendedor: 'badge-slate',
};

export function BadgePerfil({ perfil }: { perfil: Perfil }) {
  return <span className={`badge ${CLASSE_PERFIL[perfil]}`}>{perfil}</span>;
}

const CLASSE_ETAPA: Record<string, string> = {
  'Prospecção': 'badge-slate',
  Contato: 'badge-signal',
  Proposta: 'badge-amber',
};

/** RF08/RF29 — etapa do funil; fechada mostra o desfecho. */
export function BadgeEtapa({ etapa, resultado }: { etapa: Etapa; resultado?: ResultadoOportunidade }) {
  if (etapa === 'Fechado') {
    return resultado === 'ganho' ? (
      <span className="badge badge-green"><Icone nome="check" /> Ganho</span>
    ) : (
      <span className="badge badge-red"><Icone nome="close" /> Perdido</span>
    );
  }
  return <span className={`badge ${CLASSE_ETAPA[etapa]}`}>{etapa}</span>;
}

/** RF13 — faixa de vencimento da tarefa. */
export function BadgeFaixa({ faixa }: { faixa: FaixaVencimento }) {
  if (!faixa) return null;
  const info = FAIXAS[faixa];
  return <span className={`badge-faixa ${info.classe}`}>{info.rotulo}</span>;
}
