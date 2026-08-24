/**
 * Teste de fumaça da API: registra os handlers reais e simula requisições HTTP,
 * sem precisar subir o host do Azure Functions.
 *
 * Uso: node scripts/testar-api.mjs
 */
import { app } from '@azure/functions';

/* Intercepta o registro das rotas antes de importar as Functions. */
const rotas = [];
app.http = (nome, cfg) => rotas.push({ nome, ...cfg });

await import('../src/functions/health.js');
await import('../src/functions/usuarios.js');
await import('../src/functions/dashboard.js');
await import('../src/functions/clientes.js');
await import('../src/functions/interacoes.js');
await import('../src/functions/oportunidades.js');
await import('../src/functions/tarefas.js');

const contexto = { log: () => {} };

function achar(metodo, rota) {
  const r = rotas.find((x) => x.route === rota && x.methods.includes(metodo));
  if (!r) throw new Error(`rota não registrada: ${metodo} /api/${rota}`);
  return r;
}

async function chamar(metodo, rota, { params = {}, query = {}, corpo } = {}) {
  const r = achar(metodo, rota);
  const request = {
    method: metodo,
    params,
    query: new URLSearchParams(query),
    url: `http://localhost:7071/api/${rota}`,
    json: async () => {
      if (corpo === undefined) throw new Error('sem corpo');
      return corpo;
    },
  };
  return r.handler(request, contexto);
}

let passou = 0;
let falhou = 0;

async function teste(nome, fn) {
  try {
    await fn();
    passou++;
    console.log(`  ok   ${nome}`);
  } catch (e) {
    falhou++;
    console.log(`  FALHA ${nome}\n        ${e.message}`);
  }
}

function conferir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

console.log(`\nRotas registradas: ${rotas.length}`);
rotas.forEach((r) => console.log(`  ${r.methods.join(',').padEnd(6)} /api/${r.route}`));

console.log('\nLeitura');

await teste('GET /health responde 200 com a contagem da massa', async () => {
  const r = await chamar('GET', 'health');
  conferir(r.status === 200, `status ${r.status}`);
  conferir(r.jsonBody.registros.clientes === 46, 'esperava 46 clientes');
});

await teste('GET /usuarios não devolve senha', async () => {
  const r = await chamar('GET', 'usuarios');
  conferir(r.jsonBody.total === 8, `esperava 8 usuários, veio ${r.jsonBody.total}`);
  conferir(r.jsonBody.itens.every((u) => u.senha === undefined), 'vazou campo senha');
});

await teste('RF15 — Vendedor vê só a própria carteira', async () => {
  const vendedor = await chamar('GET', 'clientes', { query: { usuarioId: 'u2', porPagina: '100' } });
  conferir(
    vendedor.jsonBody.itens.every((c) => c.responsavelId === 'u2'),
    'apareceu cliente de outro responsável',
  );
  const admin = await chamar('GET', 'clientes', { query: { usuarioId: 'u3', porPagina: '100' } });
  conferir(
    admin.jsonBody.paginacao.total > vendedor.jsonBody.paginacao.total,
    'Admin deveria ver mais clientes que o Vendedor',
  );
});

await teste('RF15 — Gerente vê a si e aos vendedores da equipe', async () => {
  const r = await chamar('GET', 'clientes', { query: { usuarioId: 'u1', porPagina: '100' } });
  const permitidos = ['u1', 'u2', 'u5', 'u4'];
  conferir(
    r.jsonBody.itens.every((c) => permitidos.includes(c.responsavelId)),
    'Gerente enxergou carteira fora da equipe',
  );
  conferir(!r.jsonBody.itens.some((c) => c.responsavelId === 'u7'), 'vazou vendedor de outro gerente');
});

await teste('RF18 — paginação de 20 registros', async () => {
  const r = await chamar('GET', 'clientes', { query: { usuarioId: 'u3' } });
  conferir(r.jsonBody.itens.length === 20, `esperava 20 itens, veio ${r.jsonBody.itens.length}`);
  conferir(r.jsonBody.paginacao.porPagina === 20, 'porPagina deveria ser 20');
  const p2 = await chamar('GET', 'clientes', { query: { usuarioId: 'u3', pagina: '2' } });
  conferir(p2.jsonBody.itens[0].id !== r.jsonBody.itens[0].id, 'página 2 repetiu a página 1');
});

await teste('RF04 — busca e filtro de status', async () => {
  const busca = await chamar('GET', 'clientes', { query: { usuarioId: 'u3', q: 'acme', porPagina: '100' } });
  conferir(busca.jsonBody.itens.length > 0, 'busca por "acme" não retornou nada');
  conferir(
    busca.jsonBody.itens.every((c) => /acme/i.test(c.nome) || /acme/i.test(c.empresa)),
    'busca trouxe registro fora do termo',
  );
  const ativos = await chamar('GET', 'clientes', { query: { usuarioId: 'u3', status: 'Ativo', porPagina: '100' } });
  conferir(ativos.jsonBody.itens.every((c) => c.status === 'Ativo'), 'filtro de status falhou');
});

await teste('RF03 — cliente excluído não aparece na listagem', async () => {
  const r = await chamar('GET', 'clientes', { query: { usuarioId: 'u3', porPagina: '100' } });
  conferir(r.jsonBody.itens.every((c) => !c.excluido), 'cliente excluído apareceu na lista');
});

await teste('RF06/RF16 — detalhe traz interações, oportunidades e tarefas', async () => {
  const r = await chamar('GET', 'clientes/{id}', { params: { id: 'c1' }, query: { usuarioId: 'u3' } });
  conferir(r.status === 200, `status ${r.status}`);
  conferir(Array.isArray(r.jsonBody.interacoes), 'sem interações');
  conferir(Array.isArray(r.jsonBody.oportunidades), 'sem oportunidades');
  conferir(Array.isArray(r.jsonBody.tarefas), 'sem tarefas');
});

await teste('detalhe de cliente fora do escopo responde 404', async () => {
  const r = await chamar('GET', 'clientes/{id}', { params: { id: 'c2' }, query: { usuarioId: 'u7' } });
  conferir(r.status === 404, `esperava 404, veio ${r.status}`);
});

await teste('RF08/RF19 — funil com as 4 etapas, contagem e soma', async () => {
  const r = await chamar('GET', 'oportunidades', { query: { usuarioId: 'u3' } });
  conferir(r.jsonBody.etapas.length === 4, 'esperava 4 etapas');
  const soma = r.jsonBody.etapas
    .filter((e) => e.etapa !== 'Fechado')
    .reduce((s, e) => s + e.valorTotal, 0);
  conferir(soma === r.jsonBody.valorEmNegociacao, 'valor em negociação não bate com a soma das etapas');
});

await teste('RF11 — dashboard soma clientes por status', async () => {
  const r = await chamar('GET', 'dashboard', { query: { usuarioId: 'u3' } });
  const { total, porStatus } = r.jsonBody.clientes;
  conferir(
    Object.values(porStatus).reduce((a, b) => a + b, 0) === total,
    'soma por status diferente do total',
  );
  conferir(r.jsonBody.oportunidades.porEtapa.length === 4, 'esperava 4 etapas no dashboard');
});

await teste('RF31 — Vendedor não recebe ranking', async () => {
  const vendedor = await chamar('GET', 'dashboard', { query: { usuarioId: 'u2' } });
  conferir(vendedor.jsonBody.ranking.length === 0, 'Vendedor recebeu ranking');
  const gerente = await chamar('GET', 'dashboard', { query: { usuarioId: 'u1' } });
  conferir(gerente.jsonBody.ranking.length > 0, 'Gerente ficou sem ranking');
});

await teste('RF13 — tarefas classificadas por faixa de vencimento', async () => {
  const r = await chamar('GET', 'tarefas', { query: { usuarioId: 'u3' } });
  const { resumo } = r.jsonBody;
  conferir(resumo.vencidas + resumo.hoje + resumo.amanha + resumo.proximos15Dias > 0, 'nenhuma faixa preenchida');
  conferir(
    r.jsonBody.itens.every((t) => t.status !== 'concluida' || t.faixa === null),
    'tarefa concluída não deveria ter faixa',
  );
});

await teste('usuarioId inexistente responde 404', async () => {
  const r = await chamar('GET', 'dashboard', { query: { usuarioId: 'u999' } });
  conferir(r.status === 404, `esperava 404, veio ${r.status}`);
});

console.log('\nEscrita');

await teste('RF03 — POST /clientes cria como Prospect', async () => {
  const r = await chamar('POST', 'clientes', {
    corpo: { nome: 'Teste da Silva', empresa: 'Testes SA', email: 'teste@testes.com.br', responsavelId: 'u2' },
  });
  conferir(r.status === 201, `esperava 201, veio ${r.status}`);
  conferir(r.jsonBody.status === 'Prospect', 'cliente novo deveria nascer Prospect');
  conferir(r.jsonBody.id.startsWith('c_'), 'id não gerado');
  conferir(r.jsonBody.responsavelNome === 'Pedro Dias', 'nome do responsável não resolvido');
});

await teste('POST /clientes com e-mail inválido responde 400', async () => {
  const r = await chamar('POST', 'clientes', {
    corpo: { nome: 'Fulano', empresa: 'X Corp', email: 'nao-eh-email', responsavelId: 'u2' },
  });
  conferir(r.status === 400, `esperava 400, veio ${r.status}`);
  conferir(r.jsonBody.erros.some((e) => e.startsWith('email')), 'não apontou o erro de e-mail');
});

await teste('POST /clientes com responsável inexistente responde 400', async () => {
  const r = await chamar('POST', 'clientes', {
    corpo: { nome: 'Fulano', empresa: 'X Corp', email: 'f@x.com.br', responsavelId: 'u999' },
  });
  conferir(r.status === 400, `esperava 400, veio ${r.status}`);
});

await teste('RF03 — DELETE aplica exclusão lógica', async () => {
  const r = await chamar('DELETE', 'clientes/{id}', { params: { id: 'c1' } });
  conferir(r.status === 200, `status ${r.status}`);
  conferir(r.jsonBody.excluido === true && r.jsonBody.status === 'Inativo', 'não marcou como inativo/excluído');
});

await teste('RF05 — POST de interação valida o tipo', async () => {
  const bom = await chamar('POST', 'clientes/{id}/interacoes', {
    params: { id: 'c1' },
    corpo: { tipo: 'Ligação', obs: 'Cliente pediu proposta revisada.' },
  });
  conferir(bom.status === 201, `esperava 201, veio ${bom.status}`);
  conferir(bom.jsonBody.icon === 'phone', 'ícone não resolvido');

  const ruim = await chamar('POST', 'clientes/{id}/interacoes', {
    params: { id: 'c1' },
    corpo: { tipo: 'WhatsApp', obs: 'Mandei mensagem.' },
  });
  conferir(ruim.status === 400, `tipo inválido deveria dar 400, veio ${ruim.status}`);
});

await teste('RF29 — fechar como perdido exige motivo da lista fixa', async () => {
  const semMotivo = await chamar('PATCH', 'oportunidades/{id}', {
    params: { id: 'o_52sguo' },
    corpo: { etapa: 'Fechado', resultado: 'perdido' },
  });
  conferir(semMotivo.status === 400, `esperava 400, veio ${semMotivo.status}`);

  const comMotivo = await chamar('PATCH', 'oportunidades/{id}', {
    params: { id: 'o_52sguo' },
    corpo: { etapa: 'Fechado', resultado: 'perdido', motivoPerda: 'Concorrente' },
  });
  conferir(comMotivo.status === 200, `esperava 200, veio ${comMotivo.status}`);
  conferir(comMotivo.jsonBody.oportunidade.motivoPerda === 'Concorrente', 'motivo não gravado');
});

await teste('RF09 — sair de Fechado exige reabertura explícita', async () => {
  const dados = (await import('../src/shared/dados.js')).carregarDados();
  const fechada = dados.oportunidades.find((o) => o.etapa === 'Fechado');

  const sem = await chamar('PATCH', 'oportunidades/{id}', {
    params: { id: fechada.id },
    corpo: { etapa: 'Proposta' },
  });
  conferir(sem.status === 400, `esperava 400, veio ${sem.status}`);

  const com = await chamar('PATCH', 'oportunidades/{id}', {
    params: { id: fechada.id },
    corpo: { etapa: 'Proposta', reabrir: true },
  });
  conferir(com.status === 200, `esperava 200, veio ${com.status}`);
  conferir(com.jsonBody.reaberta === true, 'não sinalizou reabertura');
});

await teste('RF30 — ganhar oportunidade promove o cliente a Ativo', async () => {
  const dados = (await import('../src/shared/dados.js')).carregarDados();
  const aberta = dados.oportunidades.find((o) => o.etapa === 'Proposta');
  const r = await chamar('PATCH', 'oportunidades/{id}', {
    params: { id: aberta.id },
    corpo: { etapa: 'Fechado', resultado: 'ganho' },
  });
  conferir(r.jsonBody.clienteStatus === 'Ativo', 'cliente não foi promovido a Ativo');
});

await teste('RF07 — POST /oportunidades exige valor positivo', async () => {
  const r = await chamar('POST', 'oportunidades', {
    corpo: { clienteId: 'c1', titulo: 'Renovação anual', valor: 0 },
  });
  conferir(r.status === 400, `esperava 400, veio ${r.status}`);

  const bom = await chamar('POST', 'oportunidades', {
    corpo: { clienteId: 'c1', titulo: 'Renovação anual', valor: 45000 },
  });
  conferir(bom.status === 201, `esperava 201, veio ${bom.status}`);
  conferir(bom.jsonBody.etapa === 'Prospecção', 'oportunidade nova deveria começar em Prospecção');
});

await teste('RF28 — PATCH conclui tarefa e zera a faixa', async () => {
  const dados = (await import('../src/shared/dados.js')).carregarDados();
  const pendente = dados.tarefas.find((t) => t.status === 'pendente' && t.faixa === 'vencida');
  const r = await chamar('PATCH', 'tarefas/{id}', {
    params: { id: pendente.id },
    corpo: { status: 'concluida' },
  });
  conferir(r.jsonBody.status === 'concluida', 'status não alterado');
  conferir(r.jsonBody.faixa === null, 'faixa deveria sumir ao concluir');
});

await teste('PATCH de tarefa com status inválido responde 400', async () => {
  const r = await chamar('PATCH', 'tarefas/{id}', { params: { id: 't1' }, corpo: { status: 'arquivada' } });
  conferir(r.status === 400, `esperava 400, veio ${r.status}`);
});

await teste('POST sem corpo responde 400', async () => {
  const r = await chamar('POST', 'clientes');
  conferir(r.status === 400, `esperava 400, veio ${r.status}`);
});

console.log(`\n${passou} passaram, ${falhou} falharam\n`);
process.exit(falhou > 0 ? 1 : 0);
