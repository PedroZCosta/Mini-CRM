import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolverEscopo } from '../src/shared/escopo.js';

test('resolverEscopo sem usuarioId assume o Administrador do seed', () => {
  const { usuario, padrao } = resolverEscopo(null);
  assert.equal(usuario.perfil, 'Admin');
  assert.equal(padrao, true);
});

test('resolverEscopo com usuarioId inexistente devolve usuario nulo', () => {
  const { usuario, ids } = resolverEscopo('nao-existe');
  assert.equal(usuario, null);
  assert.deepEqual(ids, []);
});
