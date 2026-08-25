import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ErroApi } from '../api/cliente';
import { useApi } from '../api/hooks';
import { useAuth } from '../auth/contexto';
import { Carregando, ErroCaixa } from '../componentes/Estados';
import { Icone } from '../componentes/Icone';
import { Modal } from '../componentes/Modal';
import { useToast } from '../componentes/toast-contexto';
import { useAlteracoes } from '../estado/contexto';
import { mesclarFunil } from '../estado/mesclar';
import type { Etapa, MotivoPerda, Oportunidade, RespostaFunil } from '../tipos';
import { dataCurta, moeda, moedaCurta } from '../util/formato';

const MOTIVOS: MotivoPerda[] = ['Preço', 'Concorrente', 'Sem verba', 'Sem resposta'];

interface Movimento {
  oportunidade: Oportunidade;
  destino: Etapa;
}

export function Funil() {
  const { sessao } = useAuth();
  const usuarioId = sessao!.usuario.id;
  const { alteracoes, alterarOportunidade } = useAlteracoes();
  const mostrarToast = useToast();

  const [arrastando, setArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<Etapa | null>(null);
  const [fechamento, setFechamento] = useState<Movimento | null>(null);
  const [reabertura, setReabertura] = useState<Movimento | null>(null);

  const funil = useApi<RespostaFunil>(
    (signal) => api.get('/oportunidades', { usuarioId }, signal),
    [usuarioId],
  );

  if (funil.carregando && !funil.dados) return <Carregando texto="Carregando o funil…" />;
  if (funil.erro) return <ErroCaixa erro={funil.erro} aoTentarNovamente={funil.recarregar} />;
  if (!funil.dados) return null;

  const dadosBrutos = funil.dados;
  const { etapas, valorEmNegociacao, total } = mesclarFunil(
    dadosBrutos.etapas,
    alteracoes,
    /* O escopo já veio filtrado pela API; aqui só mantemos os mesmos responsáveis. */
    [...new Set(dadosBrutos.etapas.flatMap((e) => e.itens.map((o) => o.responsavelId)))],
  );

  /** Aplica a movimentação na API e guarda o resultado no estado local. */
  async function mover(oportunidade: Oportunidade, destino: Etapa, extras: Record<string, unknown> = {}) {
    try {
      const resposta = await api.patch<{
        oportunidade: Oportunidade;
        clienteStatus: string | null;
        reaberta: boolean;
      }>(`/oportunidades/${oportunidade.id}`, { etapa: destino, ...extras });

      alterarOportunidade(oportunidade.id, resposta.oportunidade);

      if (resposta.clienteStatus === 'Ativo') {
        /* RF30 — o cliente vira Ativo na primeira oportunidade ganha. */
        mostrarToast(`Oportunidade ganha. ${oportunidade.clienteNome} agora é cliente Ativo.`);
      } else if (resposta.reaberta) {
        mostrarToast('Oportunidade reaberta e devolvida ao funil.');
      } else {
        mostrarToast(`Movida para ${destino}.`);
      }
    } catch (e) {
      mostrarToast(e instanceof ErroApi ? e.message : 'Não foi possível mover a oportunidade.');
    }
  }

  function soltarNaColuna(destino: Etapa) {
    setColunaAlvo(null);
    const id = arrastando;
    setArrastando(null);
    if (!id) return;

    const oportunidade = etapas.flatMap((e) => e.itens).find((o) => o.id === id);
    if (!oportunidade || oportunidade.etapa === destino) return;

    /* RF09 — sair de Fechado exige reabertura explícita. */
    if (oportunidade.etapa === 'Fechado') {
      setReabertura({ oportunidade, destino });
      return;
    }
    /* RF29 — fechar exige informar o desfecho, e o motivo quando for perda. */
    if (destino === 'Fechado') {
      setFechamento({ oportunidade, destino });
      return;
    }
    mover(oportunidade, destino);
  }

  return (
    <>
      <div className="opp-summary">
        <div className="it">
          <b className="tabular">{total}</b>
          <span>Oportunidades</span>
        </div>
        <div className="it">
          <b className="tabular">{moeda(valorEmNegociacao)}</b>
          <span>Em negociação</span>
        </div>
        <div className="it">
          <b className="tabular">{etapas.find((e) => e.etapa === 'Fechado')?.ganhas ?? 0}</b>
          <span>Ganhas</span>
        </div>
        <div className="it">
          <b className="tabular">{etapas.find((e) => e.etapa === 'Fechado')?.perdidas ?? 0}</b>
          <span>Perdidas</span>
        </div>
      </div>

      <div className="kanban">
        {etapas.map((coluna) => (
          <div
            key={coluna.etapa}
            className={`kcol ${colunaAlvo === coluna.etapa ? 'dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setColunaAlvo(coluna.etapa); }}
            onDragLeave={() => setColunaAlvo((atual) => (atual === coluna.etapa ? null : atual))}
            onDrop={(e) => { e.preventDefault(); soltarNaColuna(coluna.etapa); }}
          >
            <div className="kcol-head">
              <span>{coluna.etapa}</span>
              <span className="tabular">{coluna.quantidade}</span>
            </div>
            {/* RF19 — soma dos valores estimados da etapa. */}
            <div className="kcol-total">{moedaCurta(coluna.valorTotal)}</div>

            <div className="kcards">
              {coluna.itens.map((o) => {
                const fechada = o.etapa === 'Fechado';
                return (
                  <article
                    key={o.id}
                    className={[
                      'kcard',
                      arrastando === o.id ? 'dragging' : '',
                      o.resultado === 'ganho' ? 'won' : '',
                      o.resultado === 'perdido' ? 'lost' : '',
                      fechada ? 'locked' : '',
                    ].filter(Boolean).join(' ')}
                    /* Card fechado não arrasta: sai do fim do funil só pelo botão (RF09). */
                    draggable={!fechada}
                    onDragStart={() => setArrastando(o.id)}
                    onDragEnd={() => { setArrastando(null); setColunaAlvo(null); }}
                  >
                    <div className="co">{o.clienteEmpresa}</div>
                    <div className="ti">{o.titulo}</div>
                    <div className="val">
                      {fechada && (o.resultado === 'ganho' ? '✓ Ganho · ' : '✕ Perdido · ')}
                      {moeda(o.valor)}
                    </div>
                    {o.motivoPerda && (
                      <div style={{ marginTop: 6 }}>
                        <span className="motivo-tag">motivo: {o.motivoPerda}</span>
                      </div>
                    )}
                    <div className="who">
                      <Link to={`/clientes/${o.clienteId}`}>{o.clienteNome}</Link>
                      <span className="mono">prev. {dataCurta(o.dataPrevista)}</span>
                    </div>
                    {fechada && (
                      <button
                        className="btn btn-sm reopen"
                        onClick={() => setReabertura({ oportunidade: o, destino: 'Proposta' })}
                      >
                        <Icone nome="arrow" />Reabrir
                      </button>
                    )}
                  </article>
                );
              })}

              {coluna.itens.length === 0 && (
                <div className="kdrop-hint">soltar aqui</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 12, fontSize: 11.5, color: 'var(--muted)' }}>
        Arraste os cards entre as etapas (RF09). Fechar exige informar ganho ou perdido, e a perda
        exige o motivo (RF29). Uma oportunidade já fechada só volta ao funil com reabertura explícita.
      </p>

      {fechamento && (
        <ModalFechamento
          movimento={fechamento}
          aoFechar={() => setFechamento(null)}
          aoConfirmar={(extras) => {
            mover(fechamento.oportunidade, fechamento.destino, extras);
            setFechamento(null);
          }}
        />
      )}

      {reabertura && (
        <Modal
          titulo="Reabrir oportunidade"
          aoFechar={() => setReabertura(null)}
          rodape={
            <>
              <button className="btn" onClick={() => setReabertura(null)}>Cancelar</button>
              <button
                className="btn btn-pri"
                onClick={() => {
                  mover(reabertura.oportunidade, reabertura.destino, { reabrir: true });
                  setReabertura(null);
                }}
              >
                Reabrir e mover
              </button>
            </>
          }
        >
          <p>
            <b>{reabertura.oportunidade.titulo}</b> está fechada como{' '}
            <b>{reabertura.oportunidade.resultado === 'ganho' ? 'ganho' : 'perdido'}</b>. Deseja
            devolvê-la ao funil na etapa <b>{reabertura.destino}</b>?
          </p>
          <div className="modal-note">
            RF09 — oportunidades fechadas exigem reabertura explícita antes de voltar ao funil.
          </div>
        </Modal>
      )}
    </>
  );
}

/** RF29 — desfecho do fechamento; a perda exige motivo da lista fixa. */
function ModalFechamento({
  movimento, aoFechar, aoConfirmar,
}: {
  movimento: Movimento;
  aoFechar: () => void;
  aoConfirmar: (extras: Record<string, unknown>) => void;
}) {
  const [resultado, setResultado] = useState<'ganho' | 'perdido'>('ganho');
  const [motivo, setMotivo] = useState<MotivoPerda>('Preço');

  return (
    <Modal
      titulo="Fechar oportunidade"
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn" onClick={aoFechar}>Cancelar</button>
          <button
            className="btn btn-pri"
            onClick={() => aoConfirmar(
              resultado === 'perdido' ? { resultado, motivoPerda: motivo } : { resultado },
            )}
          >
            Confirmar
          </button>
        </>
      }
    >
      <p style={{ marginBottom: 12 }}>
        <b>{movimento.oportunidade.titulo}</b> · {movimento.oportunidade.clienteNome} ·{' '}
        {moeda(movimento.oportunidade.valor)}
      </p>

      <div className="field">
        <label>Desfecho</label>
        <div className="seg">
          <button
            type="button"
            className={resultado === 'ganho' ? 'on' : ''}
            onClick={() => setResultado('ganho')}
          >
            <Icone nome="check" /> Ganho
          </button>
          <button
            type="button"
            className={resultado === 'perdido' ? 'on' : ''}
            onClick={() => setResultado('perdido')}
          >
            <Icone nome="close" /> Perdido
          </button>
        </div>
      </div>

      {resultado === 'perdido' && (
        <div className="field">
          <label htmlFor="motivo">Motivo da perda <span className="hint">— RF29</span></label>
          <select
            className="select"
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as MotivoPerda)}
          >
            {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}

      <div className="modal-note">
        {resultado === 'ganho'
          ? 'RF30 — ganhar a oportunidade promove o cliente a Ativo automaticamente.'
          : 'O motivo informado alimenta os relatórios de perda.'}
      </div>
    </Modal>
  );
}
