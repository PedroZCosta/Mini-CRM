/**
 * Alterações locais.
 *
 * As Azure Functions validam as operações de escrita e devolvem o registro
 * resultante, mas não gravam nada: são funções sem estado servindo dados mock.
 * Quem guarda o resultado é o front-end, aqui.
 *
 * O que a API decide continua vindo dela (id gerado, status inicial do cliente,
 * promoção para Ativo ao ganhar, motivo da perda). Este módulo só memoriza a
 * resposta e a mescla com o que as listagens trazem.
 *
 * O estado é persistido em localStorage para sobreviver ao recarregar a página
 * durante a apresentação. Limpar o navegador devolve a massa original.
 */
import { createContext, useContext } from 'react';
import type { Cliente, Interacao, Oportunidade, Tarefa } from '../tipos';

export interface Alteracoes {
  clientesNovos: Cliente[];
  clientesAlterados: Record<string, Partial<Cliente>>;
  clientesExcluidos: string[];
  interacoesNovas: Interacao[];
  oportunidadesNovas: Oportunidade[];
  oportunidadesAlteradas: Record<string, Partial<Oportunidade>>;
  tarefasAlteradas: Record<string, Partial<Tarefa>>;
}

export const ALTERACOES_VAZIAS: Alteracoes = {
  clientesNovos: [],
  clientesAlterados: {},
  clientesExcluidos: [],
  interacoesNovas: [],
  oportunidadesNovas: [],
  oportunidadesAlteradas: {},
  tarefasAlteradas: {},
};

export interface ContextoAlteracoes {
  alteracoes: Alteracoes;
  adicionarCliente: (cliente: Cliente) => void;
  alterarCliente: (id: string, mudancas: Partial<Cliente>) => void;
  excluirCliente: (id: string) => void;
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
