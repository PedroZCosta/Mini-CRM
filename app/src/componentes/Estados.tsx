import { Icone, type NomeIcone } from './Icone';
import type { ErroApi } from '../api/cliente';

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="empty">
      <Icone nome="spark" />
      {texto}
    </div>
  );
}

/** Erro de API com a lista de problemas que a validação devolveu. */
export function ErroCaixa({ erro, aoTentarNovamente }: { erro: ErroApi; aoTentarNovamente?: () => void }) {
  return (
    <div className="warn-inline" style={{ margin: '16px 0' }}>
      <Icone nome="warn" />
      <span>
        <b>{erro.message}</b>
        {erro.erros.length > 0 && (
          <ul style={{ marginTop: 6 }}>
            {erro.erros.map((e) => <li key={e}>· {e}</li>)}
          </ul>
        )}
        {aoTentarNovamente && (
          <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={aoTentarNovamente}>
            Tentar novamente
          </button>
        )}
      </span>
    </div>
  );
}

export function Vazio({
  titulo, descricao, icone = 'inbox',
}: { titulo: string; descricao?: string; icone?: NomeIcone }) {
  return (
    <div className="empty">
      <Icone nome={icone} />
      <b>{titulo}</b>
      {descricao}
    </div>
  );
}
