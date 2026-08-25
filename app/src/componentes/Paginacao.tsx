import { Icone } from './Icone';
import type { Paginacao as TipoPaginacao } from '../tipos';

/** RF18 — navegação das listagens paginadas em 20 registros. */
export function Paginacao({
  paginacao, aoMudar, rotuloItem = 'registros',
}: {
  paginacao: TipoPaginacao;
  aoMudar: (pagina: number) => void;
  rotuloItem?: string;
}) {
  const { pagina, porPagina, total, totalPaginas } = paginacao;
  if (total === 0) return null;

  const primeiro = (pagina - 1) * porPagina + 1;
  const ultimo = Math.min(pagina * porPagina, total);

  /* Em listas longas, mostra uma janela de páginas em torno da atual. */
  const janela = 7;
  let inicio = Math.max(1, pagina - Math.floor(janela / 2));
  const fim = Math.min(totalPaginas, inicio + janela - 1);
  inicio = Math.max(1, fim - janela + 1);
  const paginas = Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);

  return (
    <div className="table-foot">
      <span>{primeiro}–{ultimo} de {total} {rotuloItem}</span>
      <div className="pager">
        <button disabled={pagina <= 1} onClick={() => aoMudar(pagina - 1)} aria-label="Página anterior">
          <Icone nome="chevronL" />
        </button>
        {paginas.map((p) => (
          <button key={p} className={p === pagina ? 'on' : ''} onClick={() => aoMudar(p)}>{p}</button>
        ))}
        <button disabled={pagina >= totalPaginas} onClick={() => aoMudar(pagina + 1)} aria-label="Próxima página">
          <Icone nome="chevronR" />
        </button>
      </div>
    </div>
  );
}
