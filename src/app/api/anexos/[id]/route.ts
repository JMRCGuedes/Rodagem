import { getUtilizador } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { eEscritorio } from "@/lib/perfis";

export const dynamic = "force-dynamic";

/** Devolve uma fotografia, só a utilizadores da mesma empresa (o motorista só as dos seus serviços). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Não encontrado", { status: 404 });
  const u = await getUtilizador();
  if (!u) return new Response("Sem sessão", { status: 401 });

  const a = await queryOne<{ mime: string; dados: Buffer; motorista_id: string | null }>(
    `SELECT a.mime, a.dados, s.motorista_id
       FROM anexos a LEFT JOIN servicos s ON s.id = a.servico_id
      WHERE a.id = $1 AND a.empresa_id = $2`,
    [id, u.empresaId]
  );
  if (!a) return new Response("Não encontrado", { status: 404 });
  if (!eEscritorio(u) && a.motorista_id !== u.motoristaId) return new Response("Não encontrado", { status: 404 });

  return new Response(new Uint8Array(a.dados), {
    headers: {
      "Content-Type": a.mime,
      "Cache-Control": "private, max-age=86400",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
