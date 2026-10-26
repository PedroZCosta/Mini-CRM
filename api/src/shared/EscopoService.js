import {
  resolverEscopo, oportunidadesVisiveis, tarefasVisiveis, nomeResponsavel,
} from './escopo.js';

/**
 * Serviço de domínio compartilhado (RF15) injetado nos use cases das
 * slices que precisam saber o que cada usuário enxerga.
 */
export class EscopoService {
  resolver(usuarioId) {
    return resolverEscopo(usuarioId);
  }

  oportunidadesVisiveis(ids) {
    return oportunidadesVisiveis(ids);
  }

  tarefasVisiveis(ids) {
    return tarefasVisiveis(ids);
  }

  nomeResponsavel(id) {
    return nomeResponsavel(id);
  }
}
