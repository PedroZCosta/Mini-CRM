/**
 * Ícones do protótipo, convertidos de string HTML para componentes JSX.
 * Mantidos idênticos aos do protótipo para o visual não divergir.
 */
type Props = React.SVGProps<SVGSVGElement>;

const ICONES = {
  dashboard: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>),
  clientes: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="7.5" r="2.4"/><path d="M15.7 12.5c2.7.4 4.8 2.4 4.8 5.3"/></svg>),
  funil: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h18l-7 9v6l-4 2v-8L3 4Z"/></svg>),
  tarefas: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2.5v3M16 2.5v3M4 9.5h16"/><path d="m8.5 14 2 2 4-4"/></svg>),
  relatorios: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2.5h9l4.5 4.5V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z"/><path d="M14.5 2.5V7H19"/><path d="M8.5 13.5v4M12 11v6.5M15.5 15v2.5"/></svg>),
  usuarios: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M4.5 20.5c0-4.1 3.4-6.8 7.5-6.8s7.5 2.7 7.5 6.8"/></svg>),
  search: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.4-4.4"/></svg>),
  plus: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>),
  bell: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a5.5 5.5 0 0 0-5.5 5.5v3.4L4.5 15.5h15L17.5 11.9V8.5A5.5 5.5 0 0 0 12 3Z"/><path d="M9.7 19a2.4 2.4 0 0 0 4.6 0"/></svg>),
  logout: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>),
  phone: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5c0 8.6 7 15.5 15.5 15.5l1-4-5-1.5-1.5 2A11.6 11.6 0 0 1 8 9.5l2-1.5L8.5 3.5l-4 1Z"/></svg>),
  mail: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m3.5 6 8.5 6.5L20.5 6"/></svg>),
  meeting: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><circle cx="12" cy="15" r="2.3"/></svg>),
  edit: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20.5h16"/><path d="M15.5 3.5a2.1 2.1 0 0 1 3 3L8 17l-4.5 1L4.5 13.5 15.5 3.5Z"/></svg>),
  more: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>),
  chevronL: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5-7 7 7 7"/></svg>),
  chevronR: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7"/></svg>),
  warn: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5 21.5 20h-19L12 3.5Z"/><path d="M12 9.5v5M12 17.5h.01"/></svg>),
  check: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5.5 5.5L20 6"/></svg>),
  close: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m5 5 14 14M19 5 5 19"/></svg>),
  building: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="12" height="18" rx="1"/><path d="M16 8h4v13h-4M7.5 7h1M11.5 7h1M7.5 11h1M11.5 11h1M7.5 15h1M11.5 15h1"/></svg>),
  lock: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>),
  target: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>),
  trend: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 6-6 4 4 8-9"/><path d="M15 5h6v6"/></svg>),
  arrow: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>),
  spark: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>),
  inbox: (props: Props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h4.5l1.5 3h4l1.5-3H20"/><path d="M5.5 5h13l1.5 7v6.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5V12L5.5 5Z"/></svg>),
};

export type NomeIcone = keyof typeof ICONES;

/** O tamanho vem do CSS base (svg { width: 16px }), salvo override por props. */
export function Icone({ nome, ...props }: { nome: NomeIcone } & Props) {
  return ICONES[nome](props);
}
