export const PERFIS = ["gerente", "trafego", "administrativo", "motorista", "oficina"] as const;
export type Perfil = (typeof PERFIS)[number];

export const PERFIL_LABEL: Record<Perfil, string> = {
  gerente: "Gerente",
  trafego: "Gestor de tráfego",
  administrativo: "Administrativo",
  motorista: "Motorista",
  oficina: "Oficina",
};

export type Utilizador = {
  id: string;
  nome: string;
  email: string;
  perfis: Perfil[];
  empresaId: string;
  empresaNome: string;
  motoristaId: string | null;
};

const ESCRITORIO: Perfil[] = ["gerente", "trafego", "administrativo"];

export function temPerfil(u: Utilizador, ...perfis: Perfil[]) {
  return u.perfis.some((p) => perfis.includes(p));
}

/** Gerente, tráfego e administrativo: veem e editam os módulos de escritório. */
export function eEscritorio(u: Utilizador) {
  return temPerfil(u, ...ESCRITORIO);
}

/** Quem pode consultar a frota (escritório + oficina). */
export function podeVerFrota(u: Utilizador) {
  return eEscritorio(u) || temPerfil(u, "oficina");
}

export function eGerente(u: Utilizador) {
  return temPerfil(u, "gerente");
}

/** Página inicial de cada utilizador, conforme os perfis. */
export function paginaInicial(u: Utilizador) {
  if (eEscritorio(u)) return "/painel";
  if (temPerfil(u, "motorista")) return "/motorista";
  if (temPerfil(u, "oficina")) return "/frota";
  return "/sem-acesso";
}
