import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atendeFiltro } from '../src/features/usuarios/domain/Usuario.js';

test('atendeFiltro filtra por perfil', () => {
  assert.equal(atendeFiltro({ perfil: 'Vendedor', status: 'Ativo' }, { perfil: 'Gerente' }), false);
  assert.equal(atendeFiltro({ perfil: 'Vendedor', status: 'Ativo' }, { perfil: 'Vendedor' }), true);
});

test('atendeFiltro filtra apenas ativos', () => {
  assert.equal(atendeFiltro({ perfil: 'Vendedor', status: 'Inativo' }, { apenasAtivos: true }), false);
  assert.equal(atendeFiltro({ perfil: 'Vendedor', status: 'Ativo' }, { apenasAtivos: true }), true);
});
