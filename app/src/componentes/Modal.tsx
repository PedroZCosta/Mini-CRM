import { useEffect } from 'react';
import { Icone } from './Icone';

/** Modal do protótipo: overlay + caixa com cabeçalho, corpo e rodapé. */
export function Modal({
  titulo, aoFechar, children, rodape, largo = false,
}: {
  titulo: string;
  aoFechar: () => void;
  children: React.ReactNode;
  rodape?: React.ReactNode;
  largo?: boolean;
}) {
  /* Esc fecha, e o fundo não rola enquanto o modal está aberto. */
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    document.addEventListener('keydown', aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aoFechar]);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div className={largo ? 'modal wide' : 'modal'} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-head">
          <h3>{titulo}</h3>
          <button className="modal-x" onClick={aoFechar} aria-label="Fechar">
            <Icone nome="close" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {rodape && <div className="modal-foot">{rodape}</div>}
      </div>
    </div>
  );
}
