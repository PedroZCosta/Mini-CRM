import { useEffect, useState } from 'react';
import { api, ErroApi } from '../api/cliente';
import { useAuth } from '../auth/contexto';
import { SENHA_DEMO } from '../auth/contexto';
import { Icone } from '../componentes/Icone';
import type { Perfil } from '../tipos';

/** E-mail de demonstração de cada perfil, para o seletor preencher o campo. */
const EMAIL_DEMO: Record<Perfil, string> = {
  Admin: 'rui@empresa.com',
  Gerente: 'ana@empresa.com',
  Vendedor: 'pedro@empresa.com',
};

interface Contagens {
  clientes: number;
  oportunidadesAbertas: number;
}

export function Login() {
  const { entrar, bloqueioRestanteMs, aviso } = useAuth();
  const [perfil, setPerfil] = useState<Perfil>('Gerente');
  const [email, setEmail] = useState(EMAIL_DEMO.Gerente);
  const [senha, setSenha] = useState(SENHA_DEMO);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [contagens, setContagens] = useState<Contagens | null>(null);

  /* Os números do painel esquerdo vêm da API: a tela de entrada já prova que
     o front conversa com as Azure Functions antes mesmo do login. */
  useEffect(() => {
    let ativo = true;
    api
      .get<{ registros: { clientes: number } }>('/health')
      .then(async (saude) => {
        const funil = await api.get<{ etapas: { etapa: string; quantidade: number }[] }>('/oportunidades');
        if (!ativo) return;
        setContagens({
          clientes: saude.registros.clientes,
          oportunidadesAbertas: funil.etapas
            .filter((e) => e.etapa !== 'Fechado')
            .reduce((soma, e) => soma + e.quantidade, 0),
        });
      })
      .catch(() => { /* o painel apenas some se a API não responder */ });
    return () => { ativo = false; };
  }, []);

  const bloqueado = bloqueioRestanteMs > 0;
  const minutosRestantes = Math.ceil(bloqueioRestanteMs / 60000);

  function trocarPerfil(novo: Perfil) {
    setPerfil(novo);
    setEmail(EMAIL_DEMO[novo]);
    setErro('');
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (falha) {
      setErro(falha instanceof ErroApi ? falha.message : 'Não foi possível entrar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-side">
        <div className="grid-bg" />
        <div className="login-mark"><span className="dot" />Nimbus CRM</div>
        <div className="login-quote">
          <h2>Cada cliente, interação e oportunidade organizados em um único funil.</h2>
          <p>
            Mini CRM do PJBL de Soluções Cloud: cadastro de clientes, histórico de
            interações, funil de vendas e indicadores servidos por Azure Functions.
          </p>
        </div>
        <div className="login-stats">
          <div className="st">
            <b className="tabular">{contagens ? contagens.clientes : '—'}</b>
            <span>Clientes</span>
          </div>
          <div className="st">
            <b className="tabular">{contagens ? contagens.oportunidadesAbertas : '—'}</b>
            <span>Oport. abertas</span>
          </div>
          <div className="st"><b className="tabular">4</b><span>Etapas no funil</span></div>
        </div>
      </div>

      <div className="login-form-col">
        <div className="login-card">
          <h1>Entrar no sistema</h1>
          <p className="sub">Acesse sua conta para gerenciar clientes e oportunidades.</p>

          {bloqueado ? (
            <div className="warn-inline">
              <Icone nome="lock" />
              <span>
                <b>Acesso bloqueado.</b> Cinco tentativas incorretas: aguarde {minutosRestantes} minuto(s)
                para tentar de novo (RF01).
              </span>
            </div>
          ) : (erro || aviso) ? (
            <div className="warn-inline">
              <Icone nome="warn" />
              <span>{erro || aviso}</span>
            </div>
          ) : null}

          <form onSubmit={enviar} noValidate>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                className="input"
                id="email"
                type="text"
                autoComplete="username"
                placeholder="nome@empresa.com"
                value={email}
                disabled={bloqueado}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="senha">
                Senha <span className="hint">— mínimo 8 caracteres, com letras e números (RF01)</span>
              </label>
              <input
                className="input"
                id="senha"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={senha}
                disabled={bloqueado}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Perfil (demonstração) <span className="hint">— RF02</span></label>
              <div className="seg">
                {(['Admin', 'Gerente', 'Vendedor'] as Perfil[]).map((p) => (
                  <button
                    type="button"
                    key={p}
                    className={perfil === p ? 'on' : ''}
                    onClick={() => trocarPerfil(p)}
                  >
                    {p === 'Gerente' ? 'Gerente de Vendas' : p}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-pri btn-block"
              type="submit"
              style={{ height: 42, fontSize: 14, marginTop: 4 }}
              disabled={bloqueado || enviando}
            >
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div className="login-demo-note">
            Protótipo de front-end. Os dados vêm de Azure Functions com massa fictícia e a
            autenticação é simulada: o seletor preenche o e-mail de cada perfil e a senha de
            demonstração é <b>{SENHA_DEMO}</b>. O perfil escolhido muda o que a API devolve (RF15).
          </div>
        </div>
      </div>
    </div>
  );
}
