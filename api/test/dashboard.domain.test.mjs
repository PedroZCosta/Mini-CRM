import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularRanking, calcularIndicadoresOportunidades } from '../src/features/dashboard/domain/Dashboard.js';

test('calcularRanking nao aparece para Vendedor (RF31)', () => {
  const ranking = calcularRanking({ perfil: 'Vendedor' }, ['u1'], [], [], []);
  assert.deepEqual(ranking, []);
});

test('calcularRanking soma valor ganho por responsavel', () => {
  const usuarios = [{ id: 'u1', nome: 'Ana', perfil: 'Gerente', status: 'Ativo' }];
  const ganhas = [{ responsavelId: 'u1', valor: 100 }, { responsavelId: 'u1', valor: 50 }];
  const ranking = calcularRanking({ perfil: 'Gerente' }, ['u1'], usuarios, ganhas, []);
  assert.equal(ranking[0].valorGanho, 150);
  assert.equal(ranking[0].oportunidadesGanhas, 2);
});

test('calcularIndicadoresOportunidades soma valor em negociacao sem contar Fechado', () => {
  const oportunidades = [
    { etapa: 'Prospecção', valor: 100, resultado: null },
    { etapa: 'Fechado', valor: 200, resultado: 'ganho' },
  ];
  const indicadores = calcularIndicadoresOportunidades(oportunidades, ['Prospecção', 'Fechado']);
  assert.equal(indicadores.valorEmNegociacao, 100);
  assert.equal(indicadores.valorGanho, 200);
});
