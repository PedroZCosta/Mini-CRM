/**
 * Alterações locais das entidades que ainda não têm banco.
 *
 * Clientes são gravados no MongoDB Atlas pelas Azure Functions, então não passam
 * por aqui. Interações, oportunidades e tarefas continuam sendo servidas da massa
 * mock: para essas, a Function valida a escrita e devolve o registro resultante,
 * mas não persiste, e quem memoriza a resposta é o front-end.
 *
 * O que a API decide continua vindo dela (id gerado, promoção para Ativo ao
 * ganhar, motivo da perda). Este módulo só guarda a resposta e a mescla com o que
 * as listagens trazem.
 *
 * O estado é persistido em localStorage para sobreviver ao recarregar a página
 * durante a apresentação. Limpar o navegador devolve a massa original.
 */
import { createContext, useContext } from 'react';
import type { Interacao, Oportunidade, Tarefa } from '../tipos';

export interface Alteracoes {
  interacoesNovas: Interacao[];
  oportunidadesNovas: Oportunidade[];
  oportunidadesAlteradas: Record<string, Partial<Oportunidade>>;
  tarefasAlteradas: Record<string, Partial<Tarefa>>;
}

export const ALTERACOES_VAZIAS: Alteracoes = {
  interacoesNovas: [],
  oportunidadesNovas: [],
  oportunidadesAlteradas: {},
  tarefasAlteradas: {},
};

export interface ContextoAlteracoes {
  alteracoes: Alteracoes;
  adicionarInteracao: (interacao: Interacao) => void;
  adicionarOportunidade: (oportunidade: Oportunidade) => void;
  alterarOportunidade: (id: string, mudancas: Partial<Oportunidade>) => void;
  alterarTarefa: (id: string, mudancas: Partial<Tarefa>) => void;
  limpar: () => void;
  /** Quantas operações de escrita foram feitas nesta sessão. */
  total: number;
}

export const AlteracoesContext = createContext<ContextoAlteracoes | null>(null);

export function useAlteracoes() {
  const ctx = useContext(AlteracoesContext);
  if (!ctx) throw new Error('useAlteracoes precisa estar dentro de <AlteracoesProvider>');
  return ctx;
}
