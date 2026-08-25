/**
 * Cliente HTTP da API.
 *
 * Em produção o front e as Functions moram no mesmo domínio do Azure Static Web
 * Apps, então a base é o caminho relativo /api. Em desenvolvimento o Vite faz
 * proxy de /api para o servidor local (ver vite.config.ts).
 *
 * VITE_API_URL permite apontar para outra origem, por exemplo o mock do Apidog.
 */
const BASE = import.meta.env.VITE_API_URL || '/api';

/** Erro com o status e a lista de problemas devolvida pela validação da API. */
export class ErroApi extends Error {
  status: number;
  erros: string[];

  constructor(mensagem: string, status: number, erros: string[] = []) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.erros = erros;
  }
}

type Parametros = Record<string, string | number | undefined | null>;

function montarUrl(caminho: string, parametros?: Parametros) {
  const url = `${BASE}${caminho}`;
  if (!parametros) return url;
  const query = new URLSearchParams();
  Object.entries(parametros).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '' && valor !== 'Todos') {
      query.set(chave, String(valor));
    }
  });
  const s = query.toString();
  return s ? `${url}?${s}` : url;
}

async function requisitar<T>(
  metodo: string,
  caminho: string,
  { parametros, corpo, signal }: { parametros?: Parametros; corpo?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const resposta = await fetch(montarUrl(caminho, parametros), {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal,
  });

  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resposta.ok) {
    throw new ErroApi(
      dados?.erro || `Falha na requisição (${resposta.status})`,
      resposta.status,
      dados?.erros || [],
    );
  }
  return dados as T;
}

export const api = {
  get: <T>(caminho: string, parametros?: Parametros, signal?: AbortSignal) =>
    requisitar<T>('GET', caminho, { parametros, signal }),
  post: <T>(caminho: string, corpo: unknown) => requisitar<T>('POST', caminho, { corpo }),
  patch: <T>(caminho: string, corpo: unknown) => requisitar<T>('PATCH', caminho, { corpo }),
  remover: <T>(caminho: string) => requisitar<T>('DELETE', caminho),
};
