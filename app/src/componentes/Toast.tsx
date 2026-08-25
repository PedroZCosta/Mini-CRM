import { useCallback, useEffect, useState } from 'react';
import { Icone } from './Icone';
import { ToastContext } from './toast-contexto';

/** Aviso curto no rodapé, como o do protótipo. Some sozinho. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [mensagem, setMensagem] = useState('');

  const mostrar = useCallback((texto: string) => setMensagem(texto), []);

  useEffect(() => {
    if (!mensagem) return;
    const t = setTimeout(() => setMensagem(''), 2600);
    return () => clearTimeout(t);
  }, [mensagem]);

  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      <div id="toast-root">
        {mensagem && (
          <div className="toast" role="status">
            <Icone nome="check" />
            <span>{mensagem}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
