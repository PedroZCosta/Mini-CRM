import { SaudeRepositoryImpl } from './adapters/persistence/SaudeRepositoryImpl.js';
import { ObterSaudeUseCase } from './application/use-cases/ObterSaudeUseCase.js';
import { registrarRotasHealth } from './adapters/http/health.controller.js';

const saudeRepository = new SaudeRepositoryImpl();
const obterSaudeUseCase = new ObterSaudeUseCase(saudeRepository);

registrarRotasHealth({ obterSaudeUseCase });
