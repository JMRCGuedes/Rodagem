import { timingSafeEqual } from "node:crypto";
import { listarAlertas, textoDias } from "@/modules/alertas/queries";
import { empresasComGerentes } from "@/modules/contas/queries";
import { dataPt } from "@/lib/formato";

export const dynamic = "force-dynamic";

function autorizado(req: Request) {
  const segredo = process.env.CRON_SECRET;
  const enviado = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!segredo || !enviado) return false;
  const a = Buffer.from(segredo);
  const b = Buffer.from(enviado);
  return a.length === b.length && timingSafeEqual(a, b);
}

function escapar(t: string) {
  return t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

async function enviarEmail(para: string[], assunto: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const de = process.env.ALERT_EMAIL_FROM;
  if (!key || !de) return { enviado: false, motivo: "email não configurado" };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: de, to: para, subject: assunto, html }),
  });
  return { enviado: r.ok, motivo: r.ok ? undefined : `resend ${r.status}` };
}

/**
 * Resumo diário de prazos. Chamado de manhã por um agendador
 * (GitHub Actions no plano gratuito; Cron Job do Render no plano pago).
 */
export async function POST(req: Request) {
  if (!autorizado(req)) return Response.json({ erro: "não autorizado" }, { status: 401 });

  const empresas = await empresasComGerentes();
  const base = process.env.APP_URL ?? new URL(req.url).origin;
  const resultado: { empresa: string; alertas: number; enviado: boolean; motivo?: string }[] = [];

  for (const e of empresas) {
    const alertas = (await listarAlertas(e.empresa_id, 30)).filter((a) => a.gravidade !== "proximo" || a.dias === 30 || a.dias === 15);
    if (!alertas.length) {
      resultado.push({ empresa: e.empresa, alertas: 0, enviado: false, motivo: "sem alertas" });
      continue;
    }
    const linhas = alertas
      .map(
        (a) =>
          `<tr><td style="padding:6px 10px"><a href="${base}${a.link}">${escapar(a.sujeito)}</a></td>` +
          `<td style="padding:6px 10px">${escapar(a.titulo)}</td>` +
          `<td style="padding:6px 10px">${dataPt(a.dataLimite)} (${textoDias(a)})</td></tr>`
      )
      .join("");
    const html =
      `<p>Prazos que precisam de atenção na <strong>${escapar(e.empresa)}</strong>:</p>` +
      `<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${linhas}</table>` +
      `<p><a href="${base}/alertas">Abrir o Rodagem</a></p>`;
    const r = await enviarEmail(e.emails, `Rodagem: ${alertas.length} prazo(s) a tratar`, html);
    resultado.push({ empresa: e.empresa, alertas: alertas.length, ...r });
  }

  return Response.json({ ok: true, resultado });
}
