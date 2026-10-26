import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarClienteProspect, aplicarExclusaoLogica, enriquecerComResponsavel } from '../src/features/clientes/domain/Cliente.js';

test('criarClienteProspect nasce como Prospect e com campos aparados', () => {
  const gerarId = (prefixo) => `${prefixo}_teste`;
  const cliente = criarClienteProspect({
    nome: ' Ana ', empresa: ' Acme ', email: ' ana@acme.com ', telefone: '', responsavelId: 'u1',
  }, gerarId);
  assert.equal(cliente.status, 'Prospect');
  assert.equal(cliente.nome, 'Ana');
  assert.equal(cliente.id, 'c_teste');
  assert.equal(cliente.excluido, false);
});

test('aplicarExclusaoLogica marca Inativo e excluido sem apagar o registro', () => {
  const resultado = aplicarExclusaoLogica({ id: 'c1', nome: 'Ana', status: 'Ativo', excluido: false });
  assert.equal(resultado.status, 'Inativo');
  assert.equal(resultado.excluido, true);
  assert.equal(resultado.nome, 'Ana');
});

test('enriquecerComResponsavel sinaliza responsavel inativo (RF33)', () => {
  const resultado = enriquecerComResponsavel({ id: 'c1' }, { nome: 'Rui', ativo: false });
  assert.equal(resultado.responsavelNome, 'Rui');
  assert.equal(resultado.semResponsavelAtivo, true);
});
