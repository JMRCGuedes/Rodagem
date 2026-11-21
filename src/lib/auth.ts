import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query, queryOne } from "./db";
import {
  eEscritorio,
  eGerente,
  paginaInicial,
  podeVerFrota,
  temPerfil,
  type Perfil,
  type Utilizador,
} from "./perfis";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const COOKIE = "rodagem_sessao";
const DURACAO_DIAS = 30;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, saltHex, hashHex] = stored.split("$");
  if (alg !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function sha256(v: string) {
  return createHash("sha256").update(v).digest("hex");
}

/** Cria a sessão e grava o cookie. Só pode ser chamado em server actions ou route handlers. */
export async function criarSessao(utilizadorId: string) {
  const token = randomBytes(32).toString("base64url");
  const expira = new Date(Date.now() + DURACAO_DIAS * 24 * 60 * 60 * 1000);
  await query("INSERT INTO sessoes (token_hash, utilizador_id, expira_em) VALUES ($1, $2, $3)", [
    sha256(token),
    utilizadorId,
    expira,
  ]);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expira,
  });
}

export async function terminarSessao() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await query("DELETE FROM sessoes WHERE token_hash = $1", [sha256(token)]);
  jar.delete(COOKIE);
}

type LinhaSessao = {
  id: string;
  nome: string;
  email: string;
  perfis: Perfil[];
  empresa_id: string;
  empresa_nome: string;
  motorista_id: string | null;
};

/** Utilizador autenticado no pedido atual (ou null). */
export const getUtilizador = cache(async (): Promise<Utilizador | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const row = await queryOne<LinhaSessao>(
    `SELECT u.id, u.nome, u.email, u.perfis, u.empresa_id, e.nome AS empresa_nome, u.motorista_id
       FROM sessoes s
       JOIN utilizadores u ON u.id = s.utilizador_id
       JOIN empresas e ON e.id = u.empresa_id
      WHERE s.token_hash = $1 AND s.expira_em > now() AND u.ativo`,
    [sha256(token)]
  );
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    perfis: row.perfis,
    empresaId: row.empresa_id,
    empresaNome: row.empresa_nome,
    motoristaId: row.motorista_id,
  };
});

export async function requireUtilizador(): Promise<Utilizador> {
  const u = await getUtilizador();
  if (!u) redirect("/login");
  return u;
}

/** Páginas e ações do escritório (gerente, tráfego, administrativo). */
export async function requireEscritorio(): Promise<Utilizador> {
  const u = await requireUtilizador();
  if (!eEscritorio(u)) redirect(paginaInicial(u));
  return u;
}

export async function requireFrota(): Promise<Utilizador> {
  const u = await requireUtilizador();
  if (!podeVerFrota(u)) redirect(paginaInicial(u));
  return u;
}

export async function requireGerente(): Promise<Utilizador> {
  const u = await requireUtilizador();
  if (!eGerente(u)) redirect(paginaInicial(u));
  return u;
}

export async function requireMotorista(): Promise<Utilizador & { motoristaId: string }> {
  const u = await requireUtilizador();
  if (!temPerfil(u, "motorista") || !u.motoristaId) redirect(paginaInicial(u));
  return u as Utilizador & { motoristaId: string };
}
