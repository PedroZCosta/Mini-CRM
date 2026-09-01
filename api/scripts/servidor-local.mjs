/**
 * Servidor HTTP local que expõe as Azure Functions sem o Azure Functions Core Tools.
 *
 * Reaproveita exatamente os mesmos handlers que rodam na nuvem: intercepta o
 * registro de rotas do `app.http` e traduz requisições Node para o formato que
 * o handler espera. Serve para desenvolver o front-end quando o `func` não está
 * instalado. Em produção quem executa é o Azure Static Web Apps.
 *
 * Uso: node scripts/servidor-local.mjs [porta]
 */
import { createServer } from 'node:http';
import { app } from '@azure/functions';
import { carregarEnvLocal } from './carregar-env.mjs';

/* MONGODB_URI precisa estar no ambiente antes de as Functions serem importadas. */
carregarEnvLocal();

const rotas = [];
app.http = (nome, cfg) => rotas.push({ nome, ...cfg });

await import('../src/functions/health.js');
await import('../src/functions/usuarios.js');
await import('../src/functions/dashboard.js');
await import('../src/functions/clientes.js');
await import('../src/functions/interacoes.js');
await import('../src/functions/oportunidades.js');
await import('../src/functions/tarefas.js');

/** Converte "clientes/{id}/interacoes" em regex com grupos nomeados. */
function compilar(rota) {
  const partes = rota.split('/').map((p) => {
    const m = p.match(/^\{(\w+)\??\}$/);
    return m ? `(?<${m[1]}>[^/]+)` : p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  return new RegExp(`^/api/${partes.join('/')}$`);
}
const compiladas = rotas.map((r) => ({ ...r, regex: compilar(r.route) }));

const contexto = { log: (...args) => console.log('   ', ...args) };

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  /* CORS liberado: o Vite roda em outra porta durante o desenvolvimento. */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  const candidatas = compiladas.filter((r) => r.regex.test(url.pathname));
  if (!candidatas.length) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ erro: `Rota ${url.pathname} não existe` }));
  }

  const rota = candidatas.find((r) => r.methods.includes(req.method));
  if (!rota) {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      erro: `Método ${req.method} não permitido`,
      permitidos: [...new Set(candidatas.flatMap((r) => r.methods))],
    }));
  }

  const corpoBruto = await new Promise((resolve) => {
    let dados = '';
    req.on('data', (c) => { dados += c; });
    req.on('end', () => resolve(dados));
  });

  const request = {
    method: req.method,
    url: url.href,
    params: rota.regex.exec(url.pathname).groups || {},
    query: url.searchParams,
    json: async () => JSON.parse(corpoBruto),
    text: async () => corpoBruto,
  };

  try {
    const r = await rota.handler(request, contexto);
    const inicio = Date.now();
    res.writeHead(r.status || 200, r.headers || { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(r.jsonBody !== undefined ? JSON.stringify(r.jsonBody) : (r.body || ''));
    console.log(`${req.method.padEnd(6)} ${url.pathname}${url.search} → ${r.status} (${Date.now() - inicio}ms)`);
  } catch (e) {
    console.error(`${req.method} ${url.pathname} → 500`, e);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ erro: 'Erro interno', detalhe: e.message }));
  }
});

const porta = Number(process.argv[2]) || 7071;
servidor.listen(porta, () => {
  console.log(`\nAPI mock do Mini CRM em http://localhost:${porta}/api\n`);
  rotas.forEach((r) => console.log(`  ${r.methods.join(',').padEnd(6)} /api/${r.route}`));
  console.log('');
});
