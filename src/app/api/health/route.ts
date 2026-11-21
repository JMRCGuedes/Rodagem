import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Usado pelo Render para confirmar que a aplicação e a base de dados respondem. */
export async function GET() {
  try {
    await query("SELECT 1");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
