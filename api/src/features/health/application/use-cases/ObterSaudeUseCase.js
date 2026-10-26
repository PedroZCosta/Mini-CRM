export class ObterSaudeUseCase {
  constructor(saudeRepository) {
    this.saudeRepository = saudeRepository;
  }

  async executar() {
    const { referencia, registros } = await this.saudeRepository.obterReferenciaERegistros();
    const banco = await this.saudeRepository.obterEstadoDoBanco();
    return {
      status: 'ok',
      api: 'Mini CRM (PJBL) — clientes no MongoDB, demais entidades mock',
      referencia,
      banco,
      registros,
    };
  }
}
