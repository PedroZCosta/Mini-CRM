import { createContext, useContext } from 'react';

/** Separado do provider para o Fast Refresh continuar funcionando no arquivo do componente. */
export const ToastContext = createContext<(mensagem: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}
