import { notFound } from "next/navigation";
import { requireMotorista } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { dataHoraPt } from "@/lib/formato";
import { eventosServico, obterServico } from "@/modules/servicos/queries";
import { referencia } from "@/modules/servicos/estados";
import { CartaoServicoMotorista } from "@/components/motorista/CartaoServico";
import { Fotos } from "@/components/Fotos";
import { Topo } from "@/components/ui";

export default async function ServicoMotorista({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireMotorista();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const dono = await queryOne("SELECT 1 FROM servicos WHERE empresa_id=$1 AND id=$2 AND motorista_id=$3", [u.empresaId, id, u.motoristaId]);
  if (!dono) notFound();
  const [s, eventos, fotos] = await Promise.all([
    obterServico(u.empresaId, id),
    eventosServico(u.empresaId, id),
    query<{ id: string }>("SELECT id FROM anexos WHERE empresa_id=$1 AND servico_id=$2 ORDER BY criado_em", [u.empresaId, id]),
  ]);
  if (!s) notFound();

  return (
    <div className="motorista">
      <Topo titulo={referencia(s.numero)} migalhas={[{ href: "/motorista", label: "Hoje" }]} />
      <CartaoServicoMotorista s={s} />
      {fotos.length > 0 && (
        <section className="cartao">
          <h2 style={{ marginBottom: 12 }}>Guia de transporte</h2>
          <Fotos ids={fotos.map((f) => f.id)} />
        </section>
      )}
      {eventos.length > 0 && (
        <section className="cartao">
          <h2 style={{ marginBottom: 12 }}>Histórico</h2>
          <ol className="linha-tempo">
            {eventos.map((e) => (
              <li key={e.id} className={`ev-${e.tipo}`}>
                <div className="small muted">{dataHoraPt(e.ocorrido_em)}</div>
                <div>{e.descricao}</div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
