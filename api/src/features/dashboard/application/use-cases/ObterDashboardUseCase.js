import { ETAPAS, STATUS_CLIENTE } from '../../../../shared/dados.js';
import {
  calcularRanking, calcularIndicadoresOportunidades, calcularIndicadoresTarefas, calcularIndicadoresClientes,
} from '../../domain/Dashboard.js';

/** GET /api/dashboard — RF11/RF15/RF19/RF31. */
export class ObterDashboardUseCase {
  constructor(clienteStatusRepository, oportunidadeConsultaRepository, tarefaConsultaRepository, usuarioConsultaRepository, escopoService) {
    this.clienteStatusRepository = clienteStatusRepository;
    this.oportunidadeConsultaRepository = oportunidadeConsultaRepository;
    this.tarefaConsultaRepository = tarefaConsultaRepository;
    this.usuarioConsultaRepository = usuarioConsultaRepository;
    this.escopoService = escopoService;
  }

  async executar({ usuarioId }) {
    const { usuario, ids } = this.escopoService.resolver(usuarioId);
    if (!usuario) return { erro: 'usuarioId não encontrado' };

    const usuarios = await this.usuarioConsultaRepository.listarTodos();
    const clientes = await this.clienteStatusRepository.listarStatusVisiveis(ids);
    const oportunidades = await this.oportunidadeConsultaRepository.listarVisiveis(ids);
    const tarefas = await this.tarefaConsultaRepository.listarVisiveis(ids);

    const ganhas = oportunidades.filter((o) => o.resultado === 'ganho');
    const perdidas = oportunidades.filter((o) => o.resultado === 'perdido');

    return {
      escopo: {
        usuarioId: usuario.id,
        nome: usuario.nome,
        perfil: usuario.perfil,
        modoVisualizacao: usuario.modoVisualizacao,
        responsaveis: ids,
      },
      clientes: calcularIndicadoresClientes(clientes, STATUS_CLIENTE),
      oportunidades: calcularIndicadoresOportunidades(oportunidades, ETAPAS),
      tarefas: calcularIndicadoresTarefas(tarefas),
      ranking: calcularRanking(usuario, ids, usuarios, ganhas, perdidas),
    };
  }
}
