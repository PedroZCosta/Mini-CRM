/** Contratos das respostas da API (Azure Functions). */

export type Perfil = 'Admin' | 'Gerente' | 'Vendedor';
export type StatusCliente = 'Prospect' | 'Ativo' | 'Inativo';
export type Etapa = 'Prospecção' | 'Contato' | 'Proposta' | 'Fechado';
export type ResultadoOportunidade = 'ganho' | 'perdido' | null;
export type MotivoPerda = 'Preço' | 'Concorrente' | 'Sem verba' | 'Sem resposta';
export type TipoInteracao = 'Ligação' | 'E-mail' | 'Reunião';
export type FaixaVencimento = 'vencida' | 'hoje' | 'amanha' | 'quinze' | null;

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  status: 'Ativo' | 'Desativado';
  gerenteId: string | null;
  modoVisualizacao: 'Total' | 'Equipe' | 'Individual';
  seed?: boolean;
}

export interface Cliente {
  id: string;
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  status: StatusCliente;
  responsavelId: string;
  excluido: boolean;
  responsavelNome: string;
  /** RF33 — responsável desativado; o registro fica visível e sinalizado. */
  semResponsavelAtivo: boolean;
}

export interface Interacao {
  id: string;
  clienteId: string;
  tipo: TipoInteracao;
  icon: 'phone' | 'mail' | 'meeting';
  cor: 'signal' | 'violet' | 'amber';
  obs: string;
  data: string;
  autorId: string;
}

export interface Oportunidade {
  id: string;
  clienteId: string;
  titulo: string;
  etapa: Etapa;
  resultado: ResultadoOportunidade;
  motivoPerda: MotivoPerda | null;
  valor: number;
  dataPrevista: string;
  atualizada: string;
  responsavelId: string;
  clienteNome?: string;
  clienteEmpresa?: string;
  responsavelNome?: string;
  semResponsavelAtivo?: boolean;
}

export interface Tarefa {
  id: string;
  titulo: string;
  clienteId: string;
  vinculoTipo: 'cliente' | 'oportunidade';
  vinculoLabel: string;
  vinculoOppId: string | null;
  vencimento: string;
  responsavelId: string;
  status: 'pendente' | 'concluida';
  faixa: FaixaVencimento;
  clienteNome?: string;
}

export interface Paginacao {
  pagina: number;
  porPagina: number;
  total: number;
  totalPaginas: number;
}

export interface RespostaClientes {
  itens: Cliente[];
  paginacao: Paginacao;
  filtros: { q: string; status: string; responsavelId: string };
  escopo: { usuarioId: string; perfil: Perfil; responsaveis: string[] };
}

export interface RespostaClienteDetalhe {
  cliente: Cliente;
  interacoes: Interacao[];
  oportunidades: Oportunidade[];
  tarefas: Tarefa[];
}

export interface EtapaFunil {
  etapa: Etapa;
  quantidade: number;
  valorTotal: number;
  ganhas: number;
  perdidas: number;
  itens: Oportunidade[];
}

export interface RespostaFunil {
  etapas: EtapaFunil[];
  total: number;
  valorEmNegociacao: number;
  escopo: { usuarioId: string; perfil: Perfil };
}

export interface RespostaTarefas {
  itens: Tarefa[];
  total: number;
  resumo: {
    pendentes: number;
    concluidas: number;
    vencidas: number;
    hoje: number;
    amanha: number;
    proximos15Dias: number;
  };
}

export interface ItemRanking {
  usuarioId: string;
  nome: string;
  perfil: string;
  ativo: boolean;
  valorGanho: number;
  oportunidadesGanhas: number;
  oportunidadesPerdidas: number;
}

export interface RespostaDashboard {
  escopo: {
    usuarioId: string;
    nome: string;
    perfil: Perfil;
    modoVisualizacao: string;
    responsaveis: string[];
  };
  clientes: { total: number; porStatus: Record<StatusCliente, number> };
  oportunidades: {
    total: number;
    valorEmNegociacao: number;
    valorGanho: number;
    ganhas: number;
    perdidas: number;
    porEtapa: { etapa: Etapa; quantidade: number; valorTotal: number }[];
    motivosPerda: Record<string, number>;
  };
  tarefas: {
    total: number;
    pendentes: number;
    concluidas: number;
    vencidas: number;
    hoje: number;
    amanha: number;
    proximos15Dias: number;
  };
  ranking: ItemRanking[];
}
