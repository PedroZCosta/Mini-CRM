import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marcarAlteracoes } from '../src/features/tarefas/domain/Tarefa.js';

test('marcarAlteracoes zera a faixa ao concluir a tarefa (RF28)', () => {
  const atual = { id: 't1', status: 'pendente', faixa: 'vencida', titulo: 'Ligar' };
  const resultado = marcarAlteracoes(atual, { status: 'concluida' }, 't1');
  assert.equal(resultado.status, 'concluida');
  assert.equal(resultado.faixa, null);
  assert.equal(resultado.titulo, 'Ligar');
});

test('marcarAlteracoes preserva a faixa quando so o titulo muda', () => {
  const atual = { id: 't1', status: 'pendente', faixa: 'hoje' };
  const resultado = marcarAlteracoes(atual, { titulo: 'Ligar de novo' }, 't1');
  assert.equal(resultado.faixa, 'hoje');
});
