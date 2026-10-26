import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moverEtapa, promoveClienteParaAtivo, foiReaberta } from '../src/features/oportunidades/domain/Oportunidade.js';

test('moverEtapa zera resultado e motivo quando a etapa nao e Fechado', () => {
  const atual = { id: 'o1', etapa: 'Fechado', resultado: 'perdido', motivoPerda: 'Preço' };
  const movimentada = moverEtapa(atual, { etapa: 'Contato', reabrir: true });
  assert.equal(movimentada.resultado, null);
  assert.equal(movimentada.motivoPerda, null);
});

test('promoveClienteParaAtivo so e verdadeiro ao fechar como ganho (RF30)', () => {
  assert.equal(promoveClienteParaAtivo({ etapa: 'Fechado', resultado: 'ganho' }), true);
  assert.equal(promoveClienteParaAtivo({ etapa: 'Fechado', resultado: 'perdido' }), false);
  assert.equal(promoveClienteParaAtivo({ etapa: 'Contato' }), false);
});

test('foiReaberta detecta saida de uma oportunidade fechada (RF09)', () => {
  assert.equal(foiReaberta({ etapa: 'Fechado' }, { etapa: 'Contato' }), true);
  assert.equal(foiReaberta({ etapa: 'Contato' }, { etapa: 'Proposta' }), false);
});
