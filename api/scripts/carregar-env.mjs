/**
 * Lê `api/local.settings.json` e joga os valores em `process.env`.
 *
 * Na nuvem, o Static Web Apps injeta essas variáveis sozinho. Localmente, quem
 * faz isso é o Azure Functions Core Tools, que não usamos aqui, então os scripts
 * chamam esta função antes de importar qualquer Function.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export function carregarEnvLocal() {
  const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
  try {
    const arquivo = JSON.parse(readFileSync(join(raiz, 'local.settings.json'), 'utf8'));
    for (const [chave, valor] of Object.entries(arquivo.Values || {})) {
      if (valor && process.env[chave] === undefined) process.env[chave] = valor;
    }
  } catch {
    /* Sem o arquivo, valem as variáveis já presentes no ambiente. */
  }
}
