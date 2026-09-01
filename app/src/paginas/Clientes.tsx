import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, ErroApi } from '../api/cliente';
import { useApi } from '../api/hooks';
import { useAuth } from '../auth/contexto';
import { Avatar } from '../componentes/Avatar';
import { BadgeStatus } from '../componentes/Badge';
import { Carregando, ErroCaixa } from '../componentes/Estados';
import { Icone } from '../componentes/Icone';
import { Modal } from '../componentes/Modal';
import { Paginacao } from '../componentes/Paginacao';
import type { Cliente, RespostaClientes, Usuario } from '../tipos';
import { useToast } from '../componentes/toast-contexto';

const STATUS_FILTRO = ['Todos', 'Ativo', 'Prospect', 'Inativo'];

export function Clientes() {
  const { sessao } = useAuth();
  const usuarioId = sessao!.usuario.id;
  const navegar = useNavigate();
  const mostrarToast = useToast();

  /* RF04 — busca e filtros ficam na URL, então sobrevivem à navegação e ao F5. */
  const [parametros, setParametros] = useSearchParams();
  const q = parametros.get('q') || '';
  const status = parametros.get('status') || 'Todos';
  const responsavelId = parametros.get('responsavelId') || 'Todos';
  const pagina = Number(parametros.get('pagina')) || 1;

  const [buscaDigitada, setBuscaDigitada] = useState(q);
  const [modalNovo, setModalNovo] = useState(false);
  const [paraEditar, setParaEditar] = useState<Cliente | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Cliente | null>(null);

  /* Busca só dispara depois que o usuário para de digitar. */
  useEffect(() => {
    const t = setTimeout(() => {
      if (buscaDigitada !== q) atualizarFiltro({ q: buscaDigitada, pagina: '1' });
    }, 350);
    return () => clearTimeout(t);
  }, [buscaDigitada]); // eslint-disable-line react-hooks/exhaustive-deps

  function atualizarFiltro(mudancas: Record<string, string>) {
    const novos = new URLSearchParams(parametros);
    Object.entries(mudancas).forEach(([chave, valor]) => {
      if (!valor || valor === 'Todos') novos.delete(chave);
      else novos.set(chave, valor);
    });
    setParametros(novos, { replace: true });
  }

  const lista = useApi<RespostaClientes>(
    (signal) => api.get('/clientes', { usuarioId, q, status, responsavelId, pagina }, signal),
    [usuarioId, q, status, responsavelId, pagina],
  );

  const usuarios = useApi<{ itens: Usuario[] }>(
    (signal) => api.get('/usuarios', undefined, signal),
    [],
  );

  if (lista.carregando && !lista.dados) return <Carregando texto="Carregando clientes…" />;
  if (lista.erro) return <ErroCaixa erro={lista.erro} aoTentarNovamente={lista.recarregar} />;
  if (!lista.dados) return null;

  const visiveis = lista.dados.escopo.responsaveis;
  /* A listagem vem inteira do MongoDB: cadastro, alteração e exclusão são
     gravados pela API, então basta recarregar depois de cada operação. */
  const itens = lista.dados.itens;

  /* RF04 — só entram no filtro os responsáveis que este perfil enxerga. */
  const responsaveis = (usuarios.dados?.itens || []).filter((u) => visiveis.includes(u.id));

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    try {
      await api.remover<Cliente>(`/clientes/${paraExcluir.id}`);
      lista.recarregar();
      mostrarToast(`${paraExcluir.nome} passou a Inativo e saiu da listagem.`);
    } catch (e) {
      mostrarToast(e instanceof ErroApi ? e.message : 'Falha ao excluir.');
    } finally {
      setParaExcluir(null);
    }
  }

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <Icone nome="search" />
          <input
            className="input"
            placeholder="buscar por nome ou empresa…"
            value={buscaDigitada}
            onChange={(e) => setBuscaDigitada(e.target.value)}
          />
        </div>

        <div className="filter-chips">
          {STATUS_FILTRO.map((s) => (
            <button
              key={s}
              className={`chip ${status === s ? 'on' : ''}`}
              onClick={() => atualizarFiltro({ status: s, pagina: '1' })}
            >
              {s}
            </button>
          ))}
        </div>

        {responsaveis.length > 1 && (
          <select
            className="sel-inline"
            value={responsavelId}
            title="Filtrar por vendedor responsável (RF04)"
            onChange={(e) => atualizarFiltro({ responsavelId: e.target.value, pagina: '1' })}
          >
            <option value="Todos">todos os responsáveis</option>
            {responsaveis.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}{u.status === 'Ativo' ? '' : ' (desativado)'}
              </option>
            ))}
          </select>
        )}

        <div className="spacer" />
        <button className="btn btn-pri" onClick={() => setModalNovo(true)}>
          <Icone nome="plus" />Novo cliente
        </button>
      </div>

      <div className="card table-card">
        <table className="dt">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Empresa</th>
              <th>Telefone</th>
              <th>Responsável</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty">
                    <Icone nome="clientes" />
                    <b>Nenhum cliente encontrado</b>
                    Ajuste a busca ou os filtros.
                  </div>
                </td>
              </tr>
            )}
            {itens.map((c) => (
              <tr key={c.id} className="clickable" onClick={() => navegar(`/clientes/${c.id}`)}>
                <td>
                  <div className="cell-name">
                    <Avatar nome={c.nome} />
                    <span style={{ fontWeight: 600 }}>{c.nome}</span>
                  </div>
                </td>
                <td>{c.empresa}</td>
                <td className="mono">{c.telefone || '—'}</td>
                <td style={{ color: 'var(--ink-soft)' }}>
                  {c.responsavelNome.split(' ')[0]}
                  {/* RF33 — o registro segue visível, sinalizado. */}
                  {c.semResponsavelAtivo && <span className="tag-orfa">sem responsável ativo</span>}
                </td>
                <td><BadgeStatus status={c.status} /></td>
                <td>
                  <div className="row-actions">
                    <button
                      className="btn btn-icon btn-sm btn-ghost"
                      title="Editar cliente"
                      onClick={(e) => { e.stopPropagation(); setParaEditar(c); }}
                    >
                      <Icone nome="edit" />
                    </button>
                    <button
                      className="btn btn-icon btn-sm btn-ghost"
                      title="Excluir (lógico)"
                      onClick={(e) => { e.stopPropagation(); setParaExcluir(c); }}
                    >
                      <Icone nome="close" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Paginacao
          paginacao={lista.dados.paginacao}
          rotuloItem="clientes"
          aoMudar={(p) => atualizarFiltro({ pagina: String(p) })}
        />
      </div>

      <p style={{ marginTop: 10, fontSize: 11.5, color: 'var(--muted)' }}>
        Cadastro, alteração e exclusão gravam no MongoDB Atlas. A exclusão é lógica (RF03):
        o cliente passa a Inativo e sai das listagens, mas o documento e o histórico ficam no banco.
      </p>

      {modalNovo && (
        <ModalCliente
          responsaveis={responsaveis}
          padraoResponsavel={sessao!.usuario.perfil === 'Vendedor' ? sessao!.usuario.id : ''}
          aoFechar={() => setModalNovo(false)}
          aoSalvar={(cliente) => {
            lista.recarregar();
            setModalNovo(false);
            mostrarToast(`${cliente.nome} cadastrado como ${cliente.status}.`);
          }}
        />
      )}

      {paraEditar && (
        <ModalCliente
          cliente={paraEditar}
          responsaveis={responsaveis}
          padraoResponsavel={paraEditar.responsavelId}
          aoFechar={() => setParaEditar(null)}
          aoSalvar={(cliente) => {
            lista.recarregar();
            setParaEditar(null);
            mostrarToast(`${cliente.nome} atualizado no banco.`);
          }}
        />
      )}

      {paraExcluir && (
        <Modal
          titulo="Excluir cliente"
          aoFechar={() => setParaExcluir(null)}
          rodape={
            <>
              <button className="btn" onClick={() => setParaExcluir(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={confirmarExclusao}>Excluir</button>
            </>
          }
        >
          <p>
            <b>{paraExcluir.nome}</b> ({paraExcluir.empresa}) passará a <b>Inativo</b> e sairá das
            listagens.
          </p>
          <div className="modal-note">
            RF03 — exclusão lógica: o histórico de interações, oportunidades e tarefas é preservado.
          </div>
        </Modal>
      )}
    </>
  );
}

/**
 * RF03 — cadastro e edição de cliente.
 * Sem `cliente`, faz POST e insere no MongoDB. Com `cliente`, faz PATCH e altera
 * o documento existente. A validação acontece na Azure Function, nos dois casos.
 */
function ModalCliente({
  cliente, responsaveis, padraoResponsavel, aoFechar, aoSalvar,
}: {
  cliente?: Cliente;
  responsaveis: Usuario[];
  padraoResponsavel: string;
  aoFechar: () => void;
  aoSalvar: (cliente: Cliente) => void;
}) {
  const edicao = Boolean(cliente);
  const [form, setForm] = useState({
    nome: cliente?.nome ?? '',
    empresa: cliente?.empresa ?? '',
    email: cliente?.email ?? '',
    telefone: cliente?.telefone ?? '',
    responsavelId: cliente?.responsavelId || padraoResponsavel || responsaveis[0]?.id || '',
    status: cliente?.status ?? 'Prospect',
  });
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  function campo(nome: keyof typeof form) {
    return {
      value: form[nome],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [nome]: e.target.value })),
    };
  }

  /** Marca o campo cujo nome aparece na lista de erros devolvida pela API. */
  const invalido = (nome: string) => erro?.erros.some((e) => e.startsWith(`${nome}:`)) ?? false;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const salvo = edicao
        ? await api.patch<Cliente>(`/clientes/${cliente!.id}`, form)
        : await api.post<Cliente>('/clientes', { ...form, status: undefined });
      aoSalvar(salvo);
    } catch (falha) {
      setErro(falha instanceof ErroApi ? falha : new ErroApi('Falha ao salvar', 0));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo={edicao ? `Editar ${cliente!.nome}` : 'Novo cliente'}
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" form="form-cliente" type="submit" disabled={enviando}>
            {enviando ? 'Salvando…' : edicao ? 'Salvar alterações' : 'Cadastrar'}
          </button>
        </>
      }
    >
      <form id="form-cliente" onSubmit={enviar} noValidate>
        {erro && (
          <div className="warn-inline" style={{ marginBottom: 12 }}>
            <Icone nome="warn" />
            <span>
              <b>{erro.message}</b>
              {erro.erros.length > 0 && (
                <ul style={{ marginTop: 4 }}>
                  {erro.erros.map((e) => <li key={e}>· {e}</li>)}
                </ul>
              )}
            </span>
          </div>
        )}

        <div className="form-grid">
          <div className={`field ${invalido('nome') ? 'invalid' : ''}`}>
            <label htmlFor="nome">Nome</label>
            <input className="input" id="nome" placeholder="Nome do contato" {...campo('nome')} />
          </div>
          <div className={`field ${invalido('empresa') ? 'invalid' : ''}`}>
            <label htmlFor="empresa">Empresa</label>
            <input className="input" id="empresa" placeholder="Razão social" {...campo('empresa')} />
          </div>
          <div className={`field ${invalido('email') ? 'invalid' : ''}`}>
            <label htmlFor="email">E-mail</label>
            <input className="input" id="email" placeholder="nome@empresa.com.br" {...campo('email')} />
          </div>
          <div className="field">
            <label htmlFor="telefone">Telefone</label>
            <input className="input" id="telefone" placeholder="(41) 99999-9999" {...campo('telefone')} />
          </div>
          <div className={`field ${invalido('responsavelId') ? 'invalid' : ''}`}>
            <label htmlFor="responsavel">Vendedor responsável <span className="hint">— RF26</span></label>
            <select className="select" id="responsavel" {...campo('responsavelId')}>
              {responsaveis.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {edicao && (
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="status">Status <span className="hint">— RF30</span></label>
            <select className="select" id="status" {...campo('status')}>
              {['Prospect', 'Ativo', 'Inativo'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        <div className="modal-note">
          {edicao
            ? 'A alteração é gravada no MongoDB Atlas pela Azure Function de update.'
            : 'RF30 — todo cliente novo nasce com status Prospect e passa a Ativo na primeira oportunidade ganha.'}
        </div>
      </form>
    </Modal>
  );
}
