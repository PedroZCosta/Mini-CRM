/** Helpers de resposta HTTP. Padroniza corpo, status e cabeçalhos das Functions. */

const CABECALHOS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

export function ok(jsonBody) {
  return { status: 200, headers: CABECALHOS, jsonBody };
}

export function criado(jsonBody) {
  return { status: 201, headers: CABECALHOS, jsonBody };
}

/** 400 — payload inválido. `erros` é a lista de problemas encontrados na validação. */
export function requisicaoInvalida(mensagem, erros = []) {
  return { status: 400, headers: CABECALHOS, jsonBody: { erro: mensagem, erros } };
}

/** 500 — falha de infraestrutura, como banco indisponível. */
export function erroInterno(mensagem) {
  return { status: 500, headers: CABECALHOS, jsonBody: { erro: mensagem } };
}

export function naoEncontrado(mensagem) {
  return { status: 404, headers: CABECALHOS, jsonBody: { erro: mensagem } };
}

/** Lê o corpo JSON tolerando corpo vazio ou malformado. */
export async function lerCorpo(request) {
  try {
    const corpo = await request.json();
    return corpo && typeof corpo === 'object' ? corpo : null;
  } catch {
    return null;
  }
}

/** RF18 — paginação de 20 registros, preservando o total do resultado filtrado. */
export function paginar(itens, pagina, porPagina = 20) {
  const total = itens.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const atual = Math.min(Math.max(1, Number(pagina) || 1), totalPaginas);
  const inicio = (atual - 1) * porPagina;
  return {
    itens: itens.slice(inicio, inicio + porPagina),
    paginacao: { pagina: atual, porPagina, total, totalPaginas },
  };
}

/** Id no formato usado pela massa mock (prefixo + sufixo base36). */
export function novoId(prefixo) {
  return `${prefixo}_${Math.random().toString(36).slice(2, 8)}`;
}
