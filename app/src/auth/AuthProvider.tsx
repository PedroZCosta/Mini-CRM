import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ErroApi } from '../api/cliente';
import type { Usuario } from '../tipos';
import {
  AuthContext, BLOQUEIO_MS, SENHA_DEMO, SESSAO_MS, senhaValida,
  type Sessao,
} from './contexto';

const CHAVE_SESSAO = 'mini-crm:sessao';

function lerSessaoSalva(): Sessao | null {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO);
    if (!bruto) return null;
    const sessao = JSON.parse(bruto) as Sessao;
    /* RF01 — sessão expirada é descartada na volta. */
    if (Date.now() > sessao.expiraEm) return null;
    return sessao;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(lerSessaoSalva);
  const [tentativas, setTentativas] = useState(0);
  const [bloqueadoAte, setBloqueadoAte] = useState<number | null>(null);
  const [aviso, setAviso] = useState('');
  const [agora, setAgora] = useState(() => Date.now());

  /* Mantém o contador de bloqueio vivo na tela sem re-render desnecessário. */
  useEffect(() => {
    if (!bloqueadoAte) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [bloqueadoAte]);

  /* O bloqueio expirado é derivado do relógio, não zerado por efeito: o estado
     é limpo na próxima tentativa de login. */
  const bloqueioRestanteMs = bloqueadoAte ? Math.max(0, bloqueadoAte - agora) : 0;

  useEffect(() => {
    if (sessao) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    else localStorage.removeItem(CHAVE_SESSAO);
  }, [sessao]);

  const sair = useCallback((motivo?: string) => {
    setSessao(null);
    setAviso(motivo || '');
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    if (bloqueioRestanteMs > 0) {
      const minutos = Math.ceil(bloqueioRestanteMs / 60000);
      throw new ErroApi(`Acesso bloqueado. Tente novamente em ${minutos} min.`, 423);
    }
    if (bloqueadoAte) {
      /* Passaram os 15 minutos: a contagem de tentativas recomeça. */
      setBloqueadoAte(null);
      setTentativas(0);
      setAviso('');
    }
    if (!senhaValida(senha)) {
      throw new ErroApi('A senha deve ter ao menos 8 caracteres, com letras e números.', 400);
    }

    const { itens } = await api.get<{ itens: Usuario[] }>('/usuarios');
    const usuario = itens.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    /* Protótipo: qualquer usuário da massa entra com a senha de demonstração. */
    if (!usuario || senha !== SENHA_DEMO) {
      const nova = tentativas + 1;
      setTentativas(nova);
      if (nova >= 5) {
        setBloqueadoAte(Date.now() + BLOQUEIO_MS);
        throw new ErroApi('Cinco tentativas incorretas: acesso bloqueado por 15 minutos.', 423);
      }
      throw new ErroApi(`E-mail ou senha inválidos. Tentativa ${nova} de 5.`, 401);
    }
    if (usuario.status !== 'Ativo') {
      throw new ErroApi('Este usuário está desativado. Procure o administrador.', 403);
    }

    setTentativas(0);
    setBloqueadoAte(null);
    setAviso('');
    setSessao({ usuario, expiraEm: Date.now() + SESSAO_MS });
  }, [bloqueioRestanteMs, bloqueadoAte, tentativas]);

  /* RF01 — expiração por inatividade: renova a cada interação do usuário. */
  useEffect(() => {
    if (!sessao) return;

    const renovar = () => {
      setSessao((atual) => {
        if (!atual) return atual;
        if (Date.now() > atual.expiraEm) return atual;
        return { ...atual, expiraEm: Date.now() + SESSAO_MS };
      });
    };
    const verificar = () => {
      setSessao((atual) => {
        if (atual && Date.now() > atual.expiraEm) {
          setAviso('Sessão expirada por inatividade (8h). Entre novamente.');
          return null;
        }
        return atual;
      });
    };

    window.addEventListener('click', renovar);
    window.addEventListener('keydown', renovar);
    const t = setInterval(verificar, 60000);
    return () => {
      window.removeEventListener('click', renovar);
      window.removeEventListener('keydown', renovar);
      clearInterval(t);
    };
  }, [sessao?.usuario.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const valor = useMemo(
    () => ({ sessao, entrar, sair, bloqueioRestanteMs, tentativas, aviso }),
    [sessao, entrar, sair, bloqueioRestanteMs, tentativas, aviso],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
