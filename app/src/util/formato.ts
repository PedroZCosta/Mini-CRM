/** Formatação de valores para exibição, sempre em pt-BR. */

export function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

/** Versão curta para cartões de indicador: R$ 1.581k. */
export function moedaCurta(valor: number) {
  if (Math.abs(valor) >= 1000) {
    return `R$ ${(valor / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`;
  }
  return moeda(valor);
}

/** A API devolve datas ISO (aaaa-mm-dd); montamos em horário local para não perder um dia. */
export function paraData(iso: string) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

export function dataCurta(iso: string) {
  return paraData(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function dataCompleta(iso: string) {
  return paraData(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function iniciais(nome: string) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

const PALETA_AVATAR = ['#2a78d6', '#7a5ea8', '#b05a2a', '#2f8f5b', '#c0392b', '#3a8f96', '#a8527e'];

/** Cor estável por nome: o mesmo usuário sempre recebe o mesmo avatar. */
export function corAvatar(nome: string) {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return PALETA_AVATAR[h % PALETA_AVATAR.length];
}

/** Rótulos das faixas de vencimento do RF13/RF24. */
export const FAIXAS = {
  vencida: { rotulo: 'vencida', classe: 'f-vencida', mensagem: 'esta atividade está vencida' },
  hoje: { rotulo: 'vence hoje', classe: 'f-hoje', mensagem: 'sua atividade vence hoje' },
  amanha: { rotulo: 'vence amanhã', classe: 'f-amanha', mensagem: 'sua atividade vai vencer amanhã' },
  quinze: { rotulo: 'vence em 15 dias', classe: 'f-quinze', mensagem: 'sua atividade vence nos próximos 15 dias' },
} as const;

export function rotuloPerfil(perfil: string) {
  return perfil === 'Gerente' ? 'Gerente de Vendas' : perfil;
}
