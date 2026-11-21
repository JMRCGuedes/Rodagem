import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireMotorista } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { referencia } from "@/modules/servicos/estados";
import { registarEntrega } from "@/modules/motorista/actions";
import { FormEntrega } from "@/components/motorista/FormEntrega";
import { Topo } from "@/components/ui";

export const metadata: Metadata = { title: "Registar entrega" };

/** UC07 — registo da entrega com a foto da guia assinada. */
export default async function Entrega({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireMotorista();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const s = await queryOne<{ numero: number; destino: string; estado: string }>(
    "SELECT numero, destino, estado FROM servicos WHERE empresa_id=$1 AND id=$2 AND motorista_id=$3",
    [u.empresaId, id, u.motoristaId]
  );
  if (!s) notFound();
  if (s.estado !== "em_curso") redirect(`/motorista/${id}`);

  return (
    <div className="motorista">
      <Topo titulo="Registar entrega" subtitulo={`${referencia(s.numero)} · ${s.destino}`} migalhas={[{ href: `/motorista/${id}`, label: referencia(s.numero) }]} />
      <section className="cartao">
        <FormEntrega action={registarEntrega.bind(null, id)} />
      </section>
    </div>
  );
}
