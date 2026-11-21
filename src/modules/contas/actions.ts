"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query, queryOne, transaction } from "@/lib/db";
import { criarSessao, hashPassword, requireGerente, terminarSessao, verifyPassword } from "@/lib/auth";
import { eDuplicado, lerForm, texto, textoOpc, uuidOpc, validar, type EstadoAcao } from "@/lib/form";
import { PERFIS, paginaInicial, type Perfil } from "@/lib/perfis";

const password = z.string({ required_error: "Escolhe uma palavra-passe." }).min(8, "A palavra-passe precisa de pelo menos 8 caracteres.");
const email = z.string({ required_error: "O email é obrigatório." }).email("Email inválido.").transform((e) => e.toLowerCase());

/** UC: registar uma nova empresa. Quem regista fica com o perfil de gerente. */
export async function registarEmpresa(_prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const v = validar(
    z.object({
      empresa: texto("Indica o nome da empresa."),
      nif: textoOpc(),
      nome: texto("Indica o teu nome."),
      email,
      password,
    }),
    lerForm(fd)
  );
  if (!v.ok) return { erro: v.erro };
  const d = v.dados;
  const hash = await hashPassword(d.password);
  let utilizadorId: string;
  try {
    utilizadorId = await transaction(async (c) => {
      const e = await c.query<{ id: string }>("INSERT INTO empresas (nome, nif) VALUES ($1, $2) RETURNING id", [d.empresa, d.nif ?? null]);
      const u = await c.query<{ id: string }>(
        `INSERT INTO utilizadores (empresa_id, nome, email, password_hash, perfis)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [e.rows[0]!.id, d.nome, d.email, hash, ["gerente"]]
      );
      return u.rows[0]!.id;
    });
  } catch (err) {
    if (eDuplicado(err)) return { erro: "Já existe uma conta com este email." };
    throw err;
  }
  await criarSessao(utilizadorId);
  redirect("/painel");
}

export async function entrar(_prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const v = validar(z.object({ email, password: z.string({ required_error: "Indica a palavra-passe." }) }), lerForm(fd));
  if (!v.ok) return { erro: v.erro };
  const u = await queryOne<{ id: string; password_hash: string; perfis: Perfil[]; motorista_id: string | null; ativo: boolean }>(
    "SELECT id, password_hash, perfis, motorista_id, ativo FROM utilizadores WHERE lower(email) = $1",
    [v.dados.email]
  );
  const ok = u ? await verifyPassword(v.dados.password, u.password_hash) : false;
  if (!u || !ok || !u.ativo) return { erro: "Email ou palavra-passe incorretos." };
  await criarSessao(u.id);
  redirect(
    paginaInicial({ id: u.id, nome: "", email: "", empresaId: "", empresaNome: "", perfis: u.perfis, motoristaId: u.motorista_id })
  );
}

export async function sair() {
  await terminarSessao();
  redirect("/login");
}

/* ---------- Gestão de utilizadores (UC16, só gerente) ---------- */

const schemaUtilizador = z.object({
  nome: texto("Indica o nome."),
  email,
  password,
  motorista_id: uuidOpc(),
});

function lerPerfis(fd: FormData): Perfil[] {
  return fd.getAll("perfis").filter((p): p is Perfil => typeof p === "string" && (PERFIS as readonly string[]).includes(p));
}

export async function criarUtilizador(_prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const g = await requireGerente();
  const v = validar(schemaUtilizador, lerForm(fd));
  if (!v.ok) return { erro: v.erro };
  const d = v.dados;
  const perfis = lerPerfis(fd);
  if (!perfis.length) return { erro: "Escolhe pelo menos um perfil." };
  if (perfis.includes("motorista") && !d.motorista_id) {
    return { erro: "Para o perfil Motorista, associa a conta a um motorista da lista." };
  }
  if (d.motorista_id) {
    const m = await queryOne("SELECT 1 FROM motoristas WHERE empresa_id=$1 AND id=$2", [g.empresaId, d.motorista_id]);
    if (!m) return { erro: "Motorista não encontrado." };
  }
  try {
    await query(
      `INSERT INTO utilizadores (empresa_id, nome, email, password_hash, perfis, motorista_id)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [g.empresaId, d.nome, d.email, await hashPassword(d.password), perfis, d.motorista_id ?? null]
    );
  } catch (err) {
    if (eDuplicado(err)) return { erro: "Já existe uma conta com este email." };
    throw err;
  }
  revalidatePath("/utilizadores");
  return { ok: `Conta criada para ${d.nome}. Envia-lhe o email e a palavra-passe inicial.` };
}

export async function alternarAtivo(id: string, _prev: EstadoAcao, _fd: FormData): Promise<EstadoAcao> {
  const g = await requireGerente();
  if (id === g.id) return { erro: "Não podes desativar a tua própria conta." };
  await query("UPDATE utilizadores SET ativo = NOT ativo WHERE empresa_id=$1 AND id=$2", [g.empresaId, id]);
  await query("DELETE FROM sessoes WHERE utilizador_id = $1 AND NOT (SELECT ativo FROM utilizadores WHERE id = $1)", [id]);
  revalidatePath("/utilizadores");
  return { ok: "Estado da conta alterado." };
}

export async function redefinirPassword(id: string, _prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const g = await requireGerente();
  const v = validar(z.object({ password }), lerForm(fd));
  if (!v.ok) return { erro: v.erro };
  const r = await queryOne<{ id: string }>(
    "UPDATE utilizadores SET password_hash=$3 WHERE empresa_id=$1 AND id=$2 RETURNING id",
    [g.empresaId, id, await hashPassword(v.dados.password)]
  );
  if (!r) return { erro: "Utilizador não encontrado." };
  if (id !== g.id) await query("DELETE FROM sessoes WHERE utilizador_id=$1", [id]);
  return { ok: "Palavra-passe alterada." };
}
