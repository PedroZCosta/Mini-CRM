import { Link } from 'react-router-dom';
import { api } from '../api/cliente';
import { useApi } from '../api/hooks';
import { useAuth } from '../auth/contexto';
import { Avatar } from '../componentes/Avatar';
import { BadgeFaixa } from '../componentes/Badge';
import { Carregando, ErroCaixa, Vazio } from '../componentes/Estados';
import { Icone } from '../componentes/Icone';
import type { RespostaDashboard, RespostaTarefas } from '../tipos';
import { dataCurta, moedaCurta } from '../util/formato';

/** Cores das etapas, iguais às do protótipo. */
const COR_ETAPA: Record<string, string> = {
  'Prospecção': '#6b6b63',
  Contato: '#2a78d6',
  Proposta: '#b05a2a',
  Fechado: '#2f8f5b',
};

const COR_STATUS: Record<string, string> = {
  Ativo: '#2f8f5b',
  Prospect: '#b05a2a',
  Inativo: '#6b6b63',
};

function BarraProporcional({
  rotulo, valor, maximo, cor, direita,
}: { rotulo: string; valor: number; maximo: number; cor: string; direita: string }) {
  const largura = maximo > 0 ? Math.max(2, (valor / maximo) * 100) : 0;
  return (
    <div className="mini-bar-row">
      <span className="lb">{rotulo}</span>
      <div className="mini-bar-track">
        <div className="mini-bar-fill" style={{ width: `${largura}%`, background: cor }} />
      </div>
      <span className="vv">{direita}</span>
    </div>
  );
}

export function Dashboard() {
  const { sessao } = useAuth();
  const usuarioId = sessao!.usuario.id;

  const painel = useApi<RespostaDashboard>(
    (signal) => api.get('/dashboard', { usuarioId }, signal),
    [usuarioId],
  );
  const tarefas = useApi<RespostaTarefas>(
    (signal) => api.get('/tarefas', { usuarioId, status: 'pendente' }, signal),
    [usuarioId],
  );

  if (painel.carregando) return <Carregando texto="Carregando indicadores…" />;
  if (painel.erro) return <ErroCaixa erro={painel.erro} aoTentarNovamente={painel.recarregar} />;
  if (!painel.dados) return null;

  const d = painel.dados;
  const maxEtapaQtd = Math.max(...d.oportunidades.porEtapa.map((e) => e.quantidade), 1);
  const maxStatus = Math.max(...Object.values(d.clientes.porStatus), 1);
  const urgentes = (tarefas.dados?.itens || [])
    .filter((t) => t.faixa === 'vencida' || t.faixa === 'hoje' || t.faixa === 'amanha')
    .slice(0, 6);
  const maiorGanho = Math.max(...d.ranking.map((r) => r.valorGanho), 1);

  return (
    <>
      {/* RF13 — tarefas vencidas e do dia em destaque na tela inicial. */}
      {(d.tarefas.vencidas > 0 || d.tarefas.hoje > 0) && (
        <div className="alert-bar">
          <Icone nome="warn" />
          <span>
            Você tem <b>{d.tarefas.vencidas}</b> tarefa(s) vencida(s) e <b>{d.tarefas.hoje}</b> com
            vencimento hoje.
          </span>
        </div>
      )}

      {/* RF11 — indicadores gerais do escopo do usuário. */}
      <div className="kpi-row">
        <div className="card kpi-card">
          <div className="lbl">Clientes na carteira</div>
          <div className="val tabular">{d.clientes.total}</div>
          <div className="delta">
            {d.clientes.porStatus.Ativo} ativos · {d.clientes.porStatus.Prospect} prospects
          </div>
        </div>
        <div className="card kpi-card">
          <div className="lbl">Valor em negociação</div>
          <div className="val tabular">{moedaCurta(d.oportunidades.valorEmNegociacao)}</div>
          <div className="delta">
            {d.oportunidades.total - d.oportunidades.ganhas - d.oportunidades.perdidas} oportunidades abertas
          </div>
        </div>
        <div className="card kpi-card">
          <div className="lbl">Fechado como ganho</div>
          <div className="val tabular">{moedaCurta(d.oportunidades.valorGanho)}</div>
          <div className="delta up">
            <Icone nome="trend" /> {d.oportunidades.ganhas} ganhas · {d.oportunidades.perdidas} perdidas
          </div>
        </div>
      </div>

      <div className="chart-row">
        {/* RF19 — contagem e soma dos valores por etapa do funil. */}
        <div className="card panel">
          <div className="panel-head">
            <div>
              <h3>Oportunidades por etapa</h3>
              <div className="sub">
                Quantidade e valor estimado · escopo: {d.escopo.perfil === 'Vendedor'
                  ? 'minha carteira'
                  : d.escopo.perfil === 'Gerente' ? 'minha equipe' : 'todos os vendedores'}
              </div>
            </div>
            <Link to="/funil" className="btn btn-sm">Ver funil</Link>
          </div>
          <div className="mini-bars">
            {d.oportunidades.porEtapa.map((e) => (
              <BarraProporcional
                key={e.etapa}
                rotulo={e.etapa}
                valor={e.quantidade}
                maximo={maxEtapaQtd}
                cor={COR_ETAPA[e.etapa]}
                direita={`${e.quantidade} · ${moedaCurta(e.valorTotal)}`}
              />
            ))}
          </div>
          <div className="legend-row">
            {d.oportunidades.porEtapa.map((e) => (
              <span className="lg" key={e.etapa}>
                <span className="sw" style={{ background: COR_ETAPA[e.etapa] }} />
                {e.etapa}
              </span>
            ))}
          </div>
        </div>

        {/* RF30 — distribuição da carteira por status. */}
        <div className="card panel">
          <div className="panel-head">
            <div>
              <h3>Clientes por status</h3>
              <div className="sub">Distribuição da carteira</div>
            </div>
          </div>
          <div className="mini-bars">
            {(['Ativo', 'Prospect', 'Inativo'] as const).map((status) => (
              <BarraProporcional
                key={status}
                rotulo={status}
                valor={d.clientes.porStatus[status]}
                maximo={maxStatus}
                cor={COR_STATUS[status]}
                direita={String(d.clientes.porStatus[status])}
              />
            ))}
          </div>
          <div className="legend-row">
            <span className="lg"><b>{d.tarefas.pendentes}</b> tarefas pendentes</span>
            <span className="lg"><b>{d.tarefas.proximos15Dias}</b> vencem em 15 dias</span>
          </div>
        </div>
      </div>

      <div className="chart-row">
        {/* RF13 — tarefas que exigem atenção imediata. */}
        <div className="card panel">
          <div className="panel-head">
            <div>
              <h3>Tarefas que precisam de atenção</h3>
              <div className="sub">Vencidas, de hoje e de amanhã · RF13</div>
            </div>
          </div>
          {tarefas.carregando && <Carregando texto="Carregando tarefas…" />}
          {!tarefas.carregando && urgentes.length === 0 && (
            <Vazio titulo="Nada vencendo agora" descricao="Nenhuma tarefa vencida ou com prazo para hoje." />
          )}
          {urgentes.map((t) => (
            <div className="task-row" key={t.id}>
              <div className="task-check" aria-hidden />
              <div className="task-body">
                <div className="tt">{t.titulo}</div>
                <div className="sub">
                  <span>{t.clienteNome}</span>
                  <BadgeFaixa faixa={t.faixa} />
                </div>
              </div>
              <span className={`task-due ${t.faixa === 'vencida' ? 'late' : t.faixa === 'hoje' ? 'today' : ''}`}>
                {dataCurta(t.vencimento)}
              </span>
            </div>
          ))}
        </div>

        {/* RF31 — ranking por valor ganho. O Vendedor não recebe esta lista da API. */}
        {d.ranking.length > 0 ? (
          <div className="card panel rank-compacto">
            <div className="panel-head">
              <div>
                <h3>Ranking por valor ganho</h3>
                <div className="sub">
                  {d.escopo.perfil === 'Admin' ? 'Todos os vendedores' : 'Meus vendedores'} · RF31
                </div>
              </div>
            </div>
            {d.ranking.map((r, i) => (
              <div className={`rank-row ${i < 3 ? `top${i + 1}` : ''}`} key={r.usuarioId}>
                <div className="rank-pos">{i + 1}</div>
                <div className="rank-nm">
                  <Avatar nome={r.nome} />
                  <span className="nome">
                    {r.nome}
                    {!r.ativo && <span className="tag-orfa"> desativado</span>}
                  </span>
                </div>
                <div className="rank-bar">
                  <i style={{ width: `${(r.valorGanho / maiorGanho) * 100}%` }} />
                </div>
                <div className="rank-vl">
                  <b>{moedaCurta(r.valorGanho)}</b>
                  <span>{r.oportunidadesGanhas} ganha(s) · {r.oportunidadesPerdidas} perdida(s)</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card panel">
            <div className="panel-head">
              <div>
                <h3>Minha carteira</h3>
                <div className="sub">Atalhos do dia a dia</div>
              </div>
            </div>
            <div className="shortcut-grid">
              <Link to="/clientes" className="shortcut">
                <Icone nome="clientes" />
                Ver meus clientes
              </Link>
              <Link to="/funil" className="shortcut">
                <Icone nome="funil" />
                Abrir o funil
              </Link>
              <Link to="/clientes" className="shortcut">
                <Icone nome="plus" />
                Cadastrar cliente
              </Link>
            </div>
            <div className="legend-row">
              <span className="lg">
                O ranking de vendedores (RF31) não é exibido para o perfil Vendedor.
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
