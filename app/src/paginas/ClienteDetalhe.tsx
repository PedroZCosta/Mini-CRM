import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ErroApi } from '../api/cliente';
import { useApi } from '../api/hooks';
import { useAuth } from '../auth/contexto';
import { Avatar } from '../componentes/Avatar';
import { BadgeEtapa, BadgeFaixa, BadgeStatus } from '../componentes/Badge';
import { Carregando, ErroCaixa, Vazio } from '../componentes/Estados';
import { Icone } from '../componentes/Icone';
import { Modal } from '../componentes/Modal';
import { useToast } from '../componentes/toast-contexto';
import { useAlteracoes } from '../estado/contexto';
import { mesclarInteracoes, mesclarOportunidades, mesclarTarefas } from '../estado/mesclar';
import type { Interacao, RespostaClienteDetalhe, TipoInteracao } from '../tipos';
import { dataCompleta, dataCurta, moeda } from '../util/formato';

const TIPOS: { tipo: TipoInteracao; icone: 'phone' | 'mail' | 'meeting' }[] = [
  { tipo: 'Ligação', icone: 'phone' },
  { tipo: 'E-mail', icone: 'mail' },
  { tipo: 'Reunião', icone: 'meeting' },
];

/** Cores dos ícones da timeline, iguais às do protótipo. */
const COR_TIMELINE: Record<string, React.CSSProperties> = {
  signal: { background: 'var(--signal-soft)', color: 'var(--signal-ink)' },
  violet: { background: 'var(--violet-soft)', color: 'var(--violet)' },
  amber: { background: 'var(--amber-soft)', color: 'var(--amber-ink)' },
};

type Aba = 'interacoes' | 'oportunidades' | 'tarefas';

export function ClienteDetalhe() {
  const { id = '' } = useParams();
  const { sessao } = useAuth();
  const usuarioId = sessao!.usuario.id;
  const { alteracoes, adicionarInteracao, alterarTarefa } = useAlteracoes();
  const mostrarToast = useToast();

  const [aba, setAba] = useState<Aba>('interacoes');
  const [modalInteracao, setModalInteracao] = useState(false);

  /* O cliente vem do MongoDB, inclusive o que acabou de ser cadastrado. */
  const detalhe = useApi<RespostaClienteDetalhe>(
    (signal) => api.get(`/clientes/${id}`, { usuarioId }, signal),
    [id, usuarioId],
  );

  if (detalhe.carregando && !detalhe.dados) return <Carregando texto="Carregando cliente…" />;
  if (detalhe.erro) {
    return (
      <>
        <Link to="/clientes" className="back-link"><Icone nome="chevronL" />Voltar para clientes</Link>
        <ErroCaixa erro={detalhe.erro} aoTentarNovamente={detalhe.recarregar} />
      </>
    );
  }
  if (!detalhe.dados) return null;

  const cliente = detalhe.dados.cliente;
  const interacoes = mesclarInteracoes(detalhe.dados.interacoes, alteracoes, cliente.id);
  const oportunidades = mesclarOportunidades(detalhe.dados.oportunidades, alteracoes, cliente.id);
  const tarefas = mesclarTarefas(detalhe.dados.tarefas, alteracoes);

  /** RF28 — conclusão da tarefa é a única mudança de estado persistida. */
  async function alternarTarefa(tarefaId: string, concluida: boolean) {
    const novoStatus = concluida ? 'pendente' : 'concluida';
    try {
      const tarefa = await api.patch<{ status: string }>(`/tarefas/${tarefaId}`, { status: novoStatus });
      alterarTarefa(tarefaId, { status: tarefa.status as 'pendente' | 'concluida' });
      mostrarToast(novoStatus === 'concluida' ? 'Tarefa concluída.' : 'Tarefa reaberta.');
    } catch (e) {
      mostrarToast(e instanceof ErroApi ? e.message : 'Falha ao atualizar a tarefa.');
    }
  }

  const abas: { chave: Aba; rotulo: string; contagem: number }[] = [
    { chave: 'interacoes', rotulo: 'Interações', contagem: interacoes.length },
    { chave: 'oportunidades', rotulo: 'Oportunidades', contagem: oportunidades.length },
    { chave: 'tarefas', rotulo: 'Tarefas', contagem: tarefas.length },
  ];

  return (
    <>
      <Link to="/clientes" className="back-link"><Icone nome="chevronL" />Voltar para clientes</Link>

      <div className="card panel client-head">
        <Avatar nome={cliente.nome} grande />
        <div className="info">
          <h2>{cliente.nome} <BadgeStatus status={cliente.status} /></h2>
          <div className="meta">
            <span><Icone nome="building" />{cliente.empresa}</span>
            <span><Icone nome="mail" />{cliente.email}</span>
            {cliente.telefone && <span><Icone nome="phone" />{cliente.telefone}</span>}
            <span>
              <Icone nome="usuarios" />{cliente.responsavelNome}
              {/* RF33 — responsável desativado, registro preservado. */}
              {cliente.semResponsavelAtivo && <span className="tag-orfa">sem responsável ativo</span>}
            </span>
          </div>
        </div>
        <div className="acts">
          <button className="btn btn-pri" onClick={() => setModalInteracao(true)}>
            <Icone nome="plus" />Registrar interação
          </button>
        </div>
      </div>

      <div className="tabs">
        {abas.map((a) => (
          <button
            key={a.chave}
            className={`tab-btn ${aba === a.chave ? 'active' : ''}`}
            onClick={() => setAba(a.chave)}
          >
            {a.rotulo} <span className="n">({a.contagem})</span>
          </button>
        ))}
      </div>

      {/* RF06 — histórico de interações do cliente. */}
      {aba === 'interacoes' && (
        <div className="card panel">
          {interacoes.length === 0 ? (
            <Vazio titulo="Nenhuma interação registrada" descricao="Registre a primeira ligação, e-mail ou reunião." />
          ) : (
            <div className="timeline">
              {interacoes.map((i) => (
                <div className="tl-item" key={i.id}>
                  <div className="tl-ico" style={COR_TIMELINE[i.cor]}>
                    <Icone nome={i.icon} />
                  </div>
                  <div className="tl-body">
                    <div className="tt">
                      <span>{i.tipo}</span>
                      <time dateTime={i.data}>{dataCompleta(i.data)}</time>
                    </div>
                    <div className="ob">{i.obs}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RF06 — oportunidades do cliente. */}
      {aba === 'oportunidades' && (
        <div className="card table-card">
          {oportunidades.length === 0 ? (
            <Vazio titulo="Nenhuma oportunidade" descricao="Este cliente ainda não tem oportunidades de venda." />
          ) : (
            <table className="dt">
              <thead>
                <tr>
                  <th>Oportunidade</th>
                  <th>Etapa</th>
                  <th>Valor estimado</th>
                  <th>Data prevista</th>
                  <th>Motivo da perda</th>
                </tr>
              </thead>
              <tbody>
                {oportunidades.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.titulo}</td>
                    <td><BadgeEtapa etapa={o.etapa} resultado={o.resultado} /></td>
                    <td className="tabular">{moeda(o.valor)}</td>
                    <td>{dataCompleta(o.dataPrevista)}</td>
                    <td>{o.motivoPerda ? <span className="motivo-tag">{o.motivoPerda}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* RF16 — tarefas do cliente e das oportunidades dele. */}
      {aba === 'tarefas' && (
        <div className="card panel">
          {tarefas.length === 0 ? (
            <Vazio titulo="Nenhuma tarefa" descricao="Não há tarefas vinculadas a este cliente." />
          ) : (
            tarefas.map((t) => {
              const concluida = t.status === 'concluida';
              return (
                <div className={`task-row ${concluida ? 'done' : ''}`} key={t.id}>
                  <button
                    className={`task-check ${concluida ? 'checked' : ''}`}
                    onClick={() => alternarTarefa(t.id, concluida)}
                    aria-label={concluida ? 'Reabrir tarefa' : 'Concluir tarefa'}
                  >
                    {concluida && <Icone nome="check" />}
                  </button>
                  <div className="task-body">
                    <div className={`tt ${concluida ? 'strike' : ''}`}>{t.titulo}</div>
                    <div className="sub">
                      <span>{t.vinculoTipo === 'oportunidade' ? 'Oportunidade' : 'Cliente'} · {t.vinculoLabel}</span>
                      <BadgeFaixa faixa={t.faixa} />
                    </div>
                  </div>
                  <span className={`task-due ${t.faixa === 'vencida' ? 'late' : t.faixa === 'hoje' ? 'today' : ''}`}>
                    {dataCurta(t.vencimento)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      {modalInteracao && (
        <ModalInteracao
          clienteId={cliente.id}
          clienteNome={cliente.nome}
          autorId={usuarioId}
          aoFechar={() => setModalInteracao(false)}
          aoRegistrar={(interacao) => {
            adicionarInteracao(interacao);
            setModalInteracao(false);
            setAba('interacoes');
            mostrarToast(`${interacao.tipo} registrada no histórico.`);
          }}
        />
      )}
    </>
  );
}

/** RF05 — registro de ligação, e-mail ou reunião. */
function ModalInteracao({
  clienteId, clienteNome, autorId, aoFechar, aoRegistrar,
}: {
  clienteId: string;
  clienteNome: string;
  /** Quem registra é o usuário logado. */
  autorId: string;
  aoFechar: () => void;
  aoRegistrar: (interacao: Interacao) => void;
}) {
  const [tipo, setTipo] = useState<TipoInteracao>('Ligação');
  const [obs, setObs] = useState('');
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const interacao = await api.post<Interacao>(
        `/clientes/${clienteId}/interacoes`,
        { tipo, obs, autorId },
      );
      aoRegistrar(interacao);
    } catch (falha) {
      setErro(falha instanceof ErroApi ? falha : new ErroApi('Falha ao registrar', 0));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo="Registrar interação"
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" form="form-interacao" type="submit" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Registrar'}
          </button>
        </>
      }
    >
      <form id="form-interacao" onSubmit={enviar} noValidate>
        {erro && (
          <div className="warn-inline" style={{ marginBottom: 12 }}>
            <Icone nome="warn" />
            <span>
              <b>{erro.message}</b>
              {erro.erros.length > 0 && (
                <ul style={{ marginTop: 4 }}>{erro.erros.map((e) => <li key={e}>· {e}</li>)}</ul>
              )}
            </span>
          </div>
        )}

        <p style={{ marginBottom: 12, color: 'var(--muted)', fontSize: 12.5 }}>
          Cliente: <b style={{ color: 'var(--ink)' }}>{clienteNome}</b>
        </p>

        <div className="field">
          <label>Tipo</label>
          <div className="seg">
            {TIPOS.map((t) => (
              <button
                type="button"
                key={t.tipo}
                className={tipo === t.tipo ? 'on' : ''}
                onClick={() => setTipo(t.tipo)}
              >
                <Icone nome={t.icone} /> {t.tipo}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="obs">Observações</label>
          <textarea
            className="input"
            id="obs"
            rows={4}
            placeholder="O que foi tratado nesta interação?"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />
        </div>

        <div className="modal-note">
          RF05 — a interação entra no histórico do cliente com data e observação.
        </div>
      </form>
    </Modal>
  );
}
