/**
 * Hook de leitura da API: dispara a requisição, cancela ao desmontar e expõe
 * carregando / erro / recarregar. Evita repetir o mesmo useEffect em cada tela.
 */
import { useCallback, useEffect, useState } from 'react';
import { ErroApi } from './cliente';

export interface EstadoRequisicao<T> {
  dados: T | null;
  carregando: boolean;
  erro: ErroApi | null;
  recarregar: () => void;
}

export function useApi<T>(
  buscar: (signal: AbortSignal) => Promise<T>,
  dependencias: unknown[],
): EstadoRequisicao<T> {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [gatilho, setGatilho] = useState(0);

  const recarregar = useCallback(() => setGatilho((n) => n + 1), []);

  useEffect(() => {
    const controle = new AbortController();
    setCarregando(true);
    setErro(null);

    buscar(controle.signal)
      .then((resultado) => {
        if (!controle.signal.aborted) setDados(resultado);
      })
      .catch((e) => {
        if (controle.signal.aborted || e?.name === 'AbortError') return;
        setErro(e instanceof ErroApi ? e : new ErroApi(e.message || 'Erro inesperado', 0));
      })
      .finally(() => {
        if (!controle.signal.aborted) setCarregando(false);
      });

    return () => controle.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, gatilho]);

  return { dados, carregando, erro, recarregar };
}
