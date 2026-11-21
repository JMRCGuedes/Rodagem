import { notFound } from "next/navigation";
import { requireMotorista } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { dataHoraPt, numeroPt } from "@/lib/formato";
import { eventosServico, obterServico } from "@/modules/servicos/queries";
import { referencia } from "@/modules/servicos/estados";
import { motoristaRegistar } from "@/modules/servicos/actions";
import { ActionForm } from "@/components/ActionForm";
import { EstadoTag, Topo } from "@/components/ui";

/** UC07 — o motorista marca carga e entrega, e comunica incidentes. */
export default async function ServicoMotorista({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireMotorista();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const dono = await queryOne("SELECT 1 FROM servicos WHERE empresa_id=$1 AND id=$2 AND motorista_id=$3", [u.empresaId, id, u.motoristaId]);
  if (!dono) notFound();
  const [s, eventos] = await Promise.all([obterServico(u.empresaId, id), eventosServico(u.empresaId, id)]);
  if (!s) notFound();

  return (
    <>
      <Topo
        titulo={
          <>
            <span className="mono">{referencia(s.numero)}</span> <EstadoTag estado={s.estado} />
          </>
        }
        migalhas={[{ href: "/motorista", label: "Os meus serviços" }]}
      />
      <section className="cartao">
        <div className="rota" style={{ marginBottom: 12 }}>
          <span>{s.origem}</span>
          <span className="seta">→</span>
          <span>{s.destino}</span>
        </div>
        <dl className="dl">
          <dt>Carga</dt>
          <dd>{dataHoraPt(s.data_carga)}</dd>
          <dt>Entrega</dt>
          <dd>{dataHoraPt(s.data_entrega)}</dd>
          <dt>Mercadoria</dt>
          <dd>
            {s.descricao_carga ?? "—"}
            {s.peso_kg && ` · ${numeroPt(s.peso_kg, " kg")}`}
          </dd>
          <dt>Veículo</dt>
          <dd className="mono">
            {s.trator ?? "—"}
            {s.reboque ? ` + ${s.reboque}` : ""}
          </dd>
          <dt>Cliente</dt>
          <dd>{s.cliente ?? "—"}</dd>
          {s.notas && (
            <>
              <dt>Notas do escritório</dt>
              <dd>{s.notas}</dd>
            </>
          )}
        </dl>
      </section>

      {s.estado === "planeado" && (
        <section className="cartao">
          <ActionForm action={motoristaRegistar.bind(null, id, "carga")} submitLabel="Carga feita, vou a caminho" className="form btn-bloco">
            <label>
              Local <span className="ajuda">opcional</span>
              <input name="local" placeholder="Armazém do cliente" />
            </label>
          </ActionForm>
        </section>
      )}
      {s.estado === "em_curso" && (
        <section className="cartao">
          <ActionForm action={motoristaRegistar.bind(null, id, "entrega")} submitLabel="Mercadoria entregue" className="form btn-bloco">
            <label>
              Quem recebeu / observações <span className="ajuda">opcional</span>
              <input name="descricao" />
            </label>
          </ActionForm>
        </section>
      )}

      {(s.estado === "planeado" || s.estado === "em_curso") && (
        <section className="cartao">
          <details>
            <summary>Comunicar um incidente</summary>
            <ActionForm action={motoristaRegistar.bind(null, id, "incidente")} submitLabel="Enviar ao escritório" variante="secundario">
              <label>
                O que aconteceu?
                <textarea name="descricao" required placeholder="Atraso no cais, avaria, acidente…" />
              </label>
              <label>
                Onde?
                <input name="local" />
              </label>
            </ActionForm>
          </details>
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
    </>
  );
}
