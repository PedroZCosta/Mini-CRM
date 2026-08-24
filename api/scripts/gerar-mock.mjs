/**
 * Gerador dos dados mock do Mini CRM (PJBL).
 *
 * Portado do protótipo de front-end (Mini_CRM_-_Prototipo_completo_2.html) para
 * que a API do Azure Functions sirva exatamente a mesma massa de dados usada na
 * validação do protótipo com o grupo.
 *
 * Duas diferenças em relação ao protótipo:
 *  1. As datas são gravadas como OFFSET EM DIAS relativo à data de referência,
 *     não como data absoluta. A Function soma o offset à data atual da
 *     requisição, então as faixas de vencimento do RF13/RF24 continuam
 *     corretas independentemente de quando o projeto for executado.
 *  2. Senhas não são gravadas: a API nunca devolve credenciais. O login é
 *     simulado no front-end (protótipo de front-end, sem backend real).
 *
 * Uso: node scripts/gerar-mock.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIA_MS = 86400000;
/* Data de referência do protótipo. Só serve para converter as datas geradas em offsets. */
const REFERENCIA = new Date(2026, 7, 4);
const diasEntre = (data) => Math.round((data.getTime() - REFERENCIA.getTime()) / DIA_MS);

/* PRNG com semente fixa: a massa de dados é sempre idêntica entre execuções. */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260804);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
const uid = (prefixo) => prefixo + '_' + Math.floor(rng() * 1e9).toString(36);

const FIRST_NAMES = ['Marcos','Julia','Renan','Carla','Ana','Pedro','Rui','Bia','Felipe','Larissa','Bruno','Camila','Diego','Fernanda','Gustavo','Helena','Igor','Juliana','Leo','Marina','Nicolas','Otavio','Patricia','Rafael','Sofia','Thiago','Vanessa','William','Yasmin','Caio','Debora','Eduardo','Flavia','Gabriel','Isabela','Joao','Karina','Lucas','Monica','Natalia'];
const LAST_NAMES = ['Lima','Prado','Souza','Nunes','Costa','Dias','Alves','Melo','Ribeiro','Barros','Cardoso','Duarte','Farias','Gouveia','Henrique','Ibra','Jardim','Lacerda','Moraes','Nogueira','Oliveira','Pinto','Queiroz','Rocha','Salles','Teixeira','Uchoa','Vieira','Xavier','Zanetti'];
const COMPANIES = ['Acme Ltda','Beta Corp','Gama SA','Delta ME','Ômega SA','Sigma Ltda','Vetta Tech','Nortex Sistemas','Bluepine Consultoria','Rota Logística','Fenix Materiais','Cedro Alimentos','Aurora Energia','Marfim Têxtil','Cobalto Digital','Prisma Educação','Talento RH','Órbita Softworks','Cravo & Canela','Litoral Transportes','Vidraçaria Sul','Amêndoa Studio','Zenit Engenharia','Bússola Contábil','Grafite Design'];
const MOTIVOS_PERDA = ['Preço','Concorrente','Sem verba','Sem resposta']; // RF29

/* RF14/RF27/RF32 — administrador do seed, gerentes e vendedores vinculados. */
function genUsuarios() {
  return [
    { id:'u3', nome:'Rui Alves',      email:'rui@empresa.com',     perfil:'Admin',    status:'Ativo',      gerenteId:null, modoVisualizacao:'Total',      seed:true },
    { id:'u1', nome:'Ana Costa',      email:'ana@empresa.com',     perfil:'Gerente',  status:'Ativo',      gerenteId:null, modoVisualizacao:'Equipe' },
    { id:'u6', nome:'Caio Bezerra',   email:'caio@empresa.com',    perfil:'Gerente',  status:'Ativo',      gerenteId:null, modoVisualizacao:'Equipe' },
    { id:'u2', nome:'Pedro Dias',     email:'pedro@empresa.com',   perfil:'Vendedor', status:'Ativo',      gerenteId:'u1', modoVisualizacao:'Individual' },
    { id:'u5', nome:'Larissa Ferraz', email:'larissa@empresa.com', perfil:'Vendedor', status:'Ativo',      gerenteId:'u1', modoVisualizacao:'Individual' },
    { id:'u4', nome:'Bia Melo',       email:'bia@empresa.com',     perfil:'Vendedor', status:'Desativado', gerenteId:'u1', modoVisualizacao:'Individual' },
    { id:'u7', nome:'Otavio Pinto',   email:'otavio@empresa.com',  perfil:'Vendedor', status:'Ativo',      gerenteId:'u6', modoVisualizacao:'Individual' },
    { id:'u8', nome:'Marina Rocha',   email:'marina@empresa.com',  perfil:'Vendedor', status:'Ativo',      gerenteId:'u6', modoVisualizacao:'Individual' },
  ];
}

/* RF03/RF26/RF30 — cliente tem exatamente um responsável e nasce como Prospect. */
function genClientes(n, vendedores) {
  const usados = new Set();
  const lista = [];
  for (let i = 0; i < n; i++) {
    let fn, ln, chave;
    do { fn = pick(FIRST_NAMES); ln = pick(LAST_NAMES); chave = fn + ln; } while (usados.has(chave));
    usados.add(chave);
    const empresa = COMPANIES[i % COMPANIES.length];
    lista.push({
      id: 'c' + (i + 1),
      nome: `${fn} ${ln}`,
      empresa,
      email: `${fn.toLowerCase()}@${empresa.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10)}.com.br`,
      telefone: `(${randInt(11, 61)}) 9${randInt(1000, 9999)}-${randInt(1000, 9999)}`,
      status: 'Prospect',
      responsavelId: vendedores[i % vendedores.length].id,
      excluido: false, // RF03 — exclusão lógica
    });
  }
  return lista;
}

/* RF05 — interações de ligação, e-mail e reunião com data e observação. */
const INTERACOES_TIPOS = [
  { tipo:'Ligação', icon:'phone',   cor:'signal', textos:['Falamos sobre renovação do contrato; pediu proposta até sexta.','Retornei a ligação, cliente ainda avaliando internamente.','Alinhamos escopo do próximo pedido.','Cliente relatou dificuldade no uso do produto, encaminhado ao suporte.'] },
  { tipo:'E-mail',  icon:'mail',    cor:'violet', textos:['Enviado catálogo atualizado.','Encaminhada proposta comercial revisada.','Follow-up sem resposta até o momento.','Confirmação de reunião enviada por e-mail.'] },
  { tipo:'Reunião', icon:'meeting', cor:'amber',  textos:['Demo do produto com equipe técnica.','Reunião de alinhamento trimestral.','Apresentação de resultados do último ciclo.','Kickoff do novo módulo contratado.'] },
];
function genInteracoes(clienteId, n, autorId) {
  const lista = [];
  let d = new Date(2026, 7, 3);
  for (let i = 0; i < n; i++) {
    const t = pick(INTERACOES_TIPOS);
    d = new Date(d.getTime() - randInt(2, 9) * DIA_MS);
    lista.push({
      id: uid('i'), clienteId, tipo: t.tipo, icon: t.icon, cor: t.cor,
      obs: pick(t.textos), offsetDias: diasEntre(d), autorId,
    });
  }
  return lista.sort((a, b) => b.offsetDias - a.offsetDias);
}

/* RF07/RF08/RF29 — oportunidade com valor, etapa, data prevista e motivo da perda. */
const OPP_TITULOS = ['Renovação anual','Plano mensal','Plano trimestral','Upgrade de plano','Módulo extra','Contrato 2026','Licenças adicionais','Consultoria de implantação','Expansão de equipe','Integração personalizada'];
function genOportunidades(clientes) {
  const lista = [];
  clientes.forEach((cli) => {
    const qtd = randInt(0, 3);
    for (let i = 0; i < qtd; i++) {
      const etapa = pick(['Prospecção','Contato','Contato','Proposta','Fechado','Fechado']);
      let resultado = null, motivoPerda = null;
      if (etapa === 'Fechado') {
        resultado = rng() < 0.68 ? 'ganho' : 'perdido';
        if (resultado === 'perdido') motivoPerda = pick(MOTIVOS_PERDA);
      }
      const atualizada = new Date(2026, 6, randInt(1, 31));
      const dataPrevista = new Date(2026, 7, randInt(6, 70));
      lista.push({
        id: uid('o'),
        clienteId: cli.id,
        titulo: pick(OPP_TITULOS),
        etapa, resultado, motivoPerda,
        valor: randInt(8, 120) * 1000,
        dataPrevistaOffsetDias: diasEntre(dataPrevista),
        atualizadaOffsetDias: diasEntre(atualizada),
        responsavelId: cli.responsavelId,
      });
    }
  });
  return lista;
}

/* RF10/RF28 — tarefa com vencimento vinculada a cliente ou oportunidade. */
const TAREFA_TITULOS = ['Enviar proposta de renovação','Ligar para follow-up da demo','Preparar apresentação','Atualizar cadastro','Agendar reunião de alinhamento','Enviar catálogo atualizado','Confirmar dados de faturamento','Revisar contrato antes do envio'];
function genTarefas(clientes, oportunidades) {
  const lista = [];
  for (let i = 0; i < 22; i++) {
    const cli = pick(clientes);
    const oppsDoCliente = oportunidades.filter((o) => o.clienteId === cli.id);
    const vinculoOpp = oppsDoCliente.length && rng() < 0.5 ? pick(oppsDoCliente) : null;
    const offsetDias = randInt(-6, 16);
    const concluida = offsetDias < -2 && rng() < 0.4;
    lista.push({
      id: uid('t'),
      titulo: pick(TAREFA_TITULOS),
      clienteId: cli.id,
      vinculoTipo: vinculoOpp ? 'oportunidade' : 'cliente',
      vinculoLabel: vinculoOpp ? vinculoOpp.titulo : cli.empresa,
      vinculoOppId: vinculoOpp ? vinculoOpp.id : null,
      vencimentoOffsetDias: offsetDias,
      responsavelId: cli.responsavelId,
      status: concluida ? 'concluida' : 'pendente', // RF28 — só "concluída" é persistido
    });
  }
  return lista;
}

/* ---- montagem ---- */
const usuarios = genUsuarios();
const vendedores = usuarios.filter((u) => u.perfil === 'Vendedor');
const clientes = genClientes(46, vendedores);

const interacoes = [];
clientes.slice(0, 22).forEach((c) => {
  interacoes.push(...genInteracoes(c.id, randInt(2, 8), c.responsavelId));
});

const oportunidades = genOportunidades(clientes);
const tarefas = genTarefas(clientes, oportunidades);

/* Garante ao menos uma tarefa em cada faixa do RF13/RF24 para cada perfil de demonstração. */
const AJUSTES_DEMO = [
  { resp:'u2', dias:-3, titulo:'Enviar proposta de renovação' },
  { resp:'u2', dias:0,  titulo:'Ligar para follow-up da demo' },
  { resp:'u2', dias:1,  titulo:'Agendar reunião de alinhamento' },
  { resp:'u2', dias:15, titulo:'Revisar contrato antes do envio' },
  { resp:'u1', dias:-1, titulo:'Confirmar dados de faturamento' },
  { resp:'u1', dias:0,  titulo:'Preparar apresentação' },
  { resp:'u1', dias:1,  titulo:'Reunião de alinhamento trimestral' },
  { resp:'u3', dias:-2, titulo:'Revisar contrato antes do envio' },
  { resp:'u3', dias:1,  titulo:'Reunião com diretoria' },
];
AJUSTES_DEMO.forEach((a, i) => {
  const t = tarefas[i];
  if (!t) return;
  const cli = clientes.find((c) => c.responsavelId === a.resp) || clientes[i];
  Object.assign(t, {
    clienteId: cli.id, vinculoTipo:'cliente', vinculoLabel: cli.empresa, vinculoOppId: null,
    responsavelId: a.resp, titulo: a.titulo, status:'pendente', vencimentoOffsetDias: a.dias,
  });
});

/* RF28 — garante tarefas já concluídas na massa, para o filtro de concluídas ter conteúdo. */
tarefas.slice(AJUSTES_DEMO.length).slice(0, 4).forEach((t, i) => {
  t.status = 'concluida';
  t.vencimentoOffsetDias = -(i + 3);
});

/* RF30 — Ativo quando há oportunidade ganha; sem histórico nenhum vira Inativo. */
clientes.forEach((c) => {
  if (oportunidades.some((o) => o.clienteId === c.id && o.resultado === 'ganho')) c.status = 'Ativo';
});
clientes
  .filter((c) => c.status === 'Prospect'
    && !oportunidades.some((o) => o.clienteId === c.id)
    && !interacoes.some((i) => i.clienteId === c.id))
  .slice(0, 7)
  .forEach((c) => { c.status = 'Inativo'; });

const saida = {
  _sobre: 'Dados mock do Mini CRM (PJBL). Gerado por scripts/gerar-mock.mjs, não editar à mão.',
  _datas: 'Campos *OffsetDias são deslocamentos em dias a partir da data da requisição. A API converte para data ISO.',
  usuarios, clientes, interacoes, oportunidades, tarefas,
};

const destino = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'mock-data.json');
writeFileSync(destino, JSON.stringify(saida, null, 2) + '\n', 'utf8');

console.log('mock-data.json gerado em', destino);
console.log(`  usuários: ${usuarios.length}  clientes: ${clientes.length}  interações: ${interacoes.length}  oportunidades: ${oportunidades.length}  tarefas: ${tarefas.length}`);
