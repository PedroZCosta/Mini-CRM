import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarInteracao } from '../src/features/interacoes/domain/Interacao.js';

test('criarInteracao resolve icone e cor pelo tipo', () => {
  const gerarId = (prefixo) => `${prefixo}_teste`;
  const interacao = criarInteracao({ clienteId: 'c1', tipo: 'Ligação', obs: 'Retornou a ligação' }, 'u1', gerarId);
  assert.equal(interacao.icon, 'phone');
  assert.equal(interacao.cor, 'signal');
  assert.equal(interacao.autorId, 'u1');
});

test('criarInteracao usa autorId explicito quando informado', () => {
  const gerarId = (prefixo) => `${prefixo}_teste`;
  const interacao = criarInteracao({ clienteId: 'c1', tipo: 'E-mail', obs: 'Enviou proposta', autorId: 'u2' }, 'u1', gerarId);
  assert.equal(interacao.autorId, 'u2');
});
