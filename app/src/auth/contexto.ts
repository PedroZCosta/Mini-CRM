/**
 * Sessão do usuário.
 *
 * Este é um protótipo de front-end: não existe backend de autenticação, então o
 * login valida contra a lista de usuários que a API devolve, usando a senha de
 * demonstração. As regras do RF01 (tamanho da senha, bloqueio por tentativas,
 * expiração da sessão) são simuladas aqui para a tela se comportar como a
 * especificada, mas não substituem autenticação real.
 */
import { createContext, useContext } from 'react';
import type { Usuario } from '../tipos';

export interface Sessao {
  usuario: Usuario;
  expiraEm: number;
}

export interface ContextoAuth {
  sessao: Sessao | null;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: (motivo?: string) => void;
  /** RF01 — milissegundos restantes de bloqueio por tentativas incorretas. */
  bloqueioRestanteMs: number;
  tentativas: number;
  aviso: string;
}

export const AuthContext = createContext<ContextoAuth | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}

/** RF01 — mínimo 8 caracteres, com letras e números. */
export function senhaValida(senha: string) {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(senha);
}

export const SENHA_DEMO = 'demo1234';
export const MINUTO = 60 * 1000;
export const BLOQUEIO_MS = 15 * MINUTO;      // RF01 — 15 minutos após 5 tentativas
export const SESSAO_MS = 8 * 60 * MINUTO;    // RF01 — 8 horas de inatividade
