import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ALTERACOES_VAZIAS, AlteracoesContext, type Alteracoes,
} from './contexto';
import type { Cliente, Interacao, Oportunidade, Tarefa } from '../tipos';

const CHAVE = 'mini-crm:alteracoes';

function ler(): Alteracoes {
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? { ...ALTERACOES_VAZIAS, ...JSON.parse(bruto) } : ALTERACOES_VAZIAS;
  } catch {
    return ALTERACOES_VAZIAS;
  }
}

export function AlteracoesProvider({ children }: { children: React.ReactNode }) {
  const [alteracoes, setAlteracoes] = useState<Alteracoes>(ler);

  useEffect(() => {
    localStorage.setItem(CHAVE, JSON.stringify(alteracoes));
  }, [alteracoes]);

  const adicionarCliente = useCallback((cliente: Cliente) => {
    setAlteracoes((a) => ({ ...a, clientesNovos: [cliente, ...a.clientesNovos] }));
  }, []);

  const alterarCliente = useCallback((id: string, mudancas: Partial<Cliente>) => {
    setAlteracoes((a) => ({
      ...a,
      /* Cliente criado nesta sessão é alterado na própria lista de novos. */
      clientesNovos: a.clientesNovos.map((c) => (c.id === id ? { ...c, ...mudancas } : c)),
      clientesAlterados: a.clientesNovos.some((c) => c.id === id)
        ? a.clientesAlterados
        : { ...a.clientesAlterados, [id]: { ...a.clientesAlterados[id], ...mudancas } },
    }));
  }, []);

  const excluirCliente = useCallback((id: string) => {
    setAlteracoes((a) => ({
      ...a,
      clientesExcluidos: a.clientesExcluidos.includes(id) ? a.clientesExcluidos : [...a.clientesExcluidos, id],
      clientesNovos: a.clientesNovos.filter((c) => c.id !== id),
    }));
  }, []);

  const adicionarInteracao = useCallback((interacao: Interacao) => {
    setAlteracoes((a) => ({ ...a, interacoesNovas: [interacao, ...a.interacoesNovas] }));
  }, []);

  const adicionarOportunidade = useCallback((oportunidade: Oportunidade) => {
    setAlteracoes((a) => ({ ...a, oportunidadesNovas: [oportunidade, ...a.oportunidadesNovas] }));
  }, []);

  const alterarOportunidade = useCallback((id: string, mudancas: Partial<Oportunidade>) => {
    setAlteracoes((a) => ({
      ...a,
      oportunidadesNovas: a.oportunidadesNovas.map((o) => (o.id === id ? { ...o, ...mudancas } : o)),
      oportunidadesAlteradas: a.oportunidadesNovas.some((o) => o.id === id)
        ? a.oportunidadesAlteradas
        : { ...a.oportunidadesAlteradas, [id]: { ...a.oportunidadesAlteradas[id], ...mudancas } },
    }));
  }, []);

  const alterarTarefa = useCallback((id: string, mudancas: Partial<Tarefa>) => {
    setAlteracoes((a) => ({
      ...a,
      tarefasAlteradas: { ...a.tarefasAlteradas, [id]: { ...a.tarefasAlteradas[id], ...mudancas } },
    }));
  }, []);

  const limpar = useCallback(() => setAlteracoes(ALTERACOES_VAZIAS), []);

  const total = alteracoes.clientesNovos.length
    + Object.keys(alteracoes.clientesAlterados).length
    + alteracoes.clientesExcluidos.length
    + alteracoes.interacoesNovas.length
    + alteracoes.oportunidadesNovas.length
    + Object.keys(alteracoes.oportunidadesAlteradas).length
    + Object.keys(alteracoes.tarefasAlteradas).length;

  const valor = useMemo(() => ({
    alteracoes, adicionarCliente, alterarCliente, excluirCliente, adicionarInteracao,
    adicionarOportunidade, alterarOportunidade, alterarTarefa, limpar, total,
  }), [alteracoes, adicionarCliente, alterarCliente, excluirCliente, adicionarInteracao,
    adicionarOportunidade, alterarOportunidade, alterarTarefa, limpar, total]);

  return <AlteracoesContext.Provider value={valor}>{children}</AlteracoesContext.Provider>;
}
