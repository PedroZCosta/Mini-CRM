import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Avatar } from './Avatar';
import { Icone, type NomeIcone } from './Icone';
import { useAuth } from '../auth/contexto';
import { rotuloPerfil } from '../util/formato';
import type { Perfil } from '../tipos';

interface ItemNav {
  para: string;
  rotulo: string;
  icone: NomeIcone;
  perfis?: Perfil[];
}

/* RF02 — o menu muda conforme o perfil; rotas restritas ficam fora da lista. */
const ITENS: ItemNav[] = [
  { para: '/dashboard', rotulo: 'Dashboard', icone: 'dashboard' },
  { para: '/clientes', rotulo: 'Clientes', icone: 'clientes' },
  { para: '/funil', rotulo: 'Funil', icone: 'funil' },
];

const TITULOS: Record<string, { titulo: string; sub: string }> = {
  '/dashboard': { titulo: 'Dashboard', sub: 'Visão geral · RF11 RF15 RF19' },
  '/clientes': { titulo: 'Clientes', sub: 'Carteira de clientes · RF03 RF04 RF18' },
  '/funil': { titulo: 'Funil de vendas', sub: 'Oportunidades por etapa · RF08 RF09' },
};

export function Layout() {
  const { sessao, sair } = useAuth();
  const local = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);

  if (!sessao) return null;
  const { usuario } = sessao;

  const itens = ITENS.filter((i) => !i.perfis || i.perfis.includes(usuario.perfil));
  const cabecalho = TITULOS[local.pathname] || { titulo: 'Cliente', sub: 'Detalhe do cliente · RF06 RF16' };

  return (
    <div className="shell">
      <aside className={`sidebar ${menuAberto ? 'open' : ''}`}>
        <div className="brand"><span className="dot" />Nimbus CRM</div>
        <nav>
          {itens.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMenuAberto(false)}
            >
              <Icone nome={item.icone} />
              <span>{item.rotulo}</span>
            </NavLink>
          ))}
        </nav>
        <div className="nav-foot">
          <div className="nav-user">
            <Avatar nome={usuario.nome} />
            <div className="who">
              <b>{usuario.nome}</b>
              {/* Só o perfil cabe nos 172px da sidebar; o modo de visualização
                  (RF25) fica no title, sem cortar no meio da palavra. */}
              <span title={`${rotuloPerfil(usuario.perfil)} · visão ${usuario.modoVisualizacao}`}>
                {usuario.perfil}
              </span>
            </div>
            <button onClick={() => sair()} title="Sair" aria-label="Sair">
              <Icone nome="logout" />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* O CSS esconde este botão fora do modo compacto pelo id. */}
            <button
              id="btn-burger"
              className="btn btn-icon btn-ghost"
              onClick={() => setMenuAberto((v) => !v)}
              aria-label="Abrir menu"
            >
              <Icone nome="more" />
            </button>
            <div>
              <h1>{cabecalho.titulo}</h1>
              <div className="crumb">{cabecalho.sub}</div>
            </div>
          </div>
        </div>
        <div className="view">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
