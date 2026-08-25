import { corAvatar, iniciais } from '../util/formato';

/** Círculo com as iniciais, cor derivada do nome (sempre a mesma pessoa, sempre a mesma cor). */
export function Avatar({ nome, grande = false }: { nome: string; grande?: boolean }) {
  return (
    <div className={grande ? 'avatar avatar-lg' : 'avatar'} style={{ background: corAvatar(nome) }}>
      {iniciais(nome)}
    </div>
  );
}
