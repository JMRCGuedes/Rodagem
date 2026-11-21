import Link from "next/link";
import type { Metadata } from "next";
import { requireMotorista } from "@/lib/auth";
import { dataHoraPt } from "@/lib/formato";
import { servicosDoMotorista } from "@/modules/servicos/queries";
import { referencia } from "@/modules/servicos/estados";
import { EstadoTag, Topo } from "@/components/ui";

export const metadata: Metadata = { title: "Os meus serviços" };

/** UC06 — o motorista vê os seus serviços no telemóvel. */
export default async function MeusServicos() {
  const u = await requireMotorista();
  const servicos = await servicosDoMotorista(u.empresaId, u.motoristaId);
  return (
    <>
      <Topo titulo="Os meus serviços" subtitulo={`Olá, ${u.nome.split(" ")[0]}.`} />
      {servicos.length === 0 ? (
        <section className="cartao">
          <p className="vazio">Não tens serviços atribuídos de momento.</p>
        </section>
      ) : (
        <div className="motorista-lista">
          {servicos.map((s) => (
            <Link key={s.id} href={`/motorista/${s.id}`} className="cartao servico-cartao">
              <div className="cartao-cab" style={{ marginBottom: 0 }}>
                <span className="mono muted">{referencia(s.numero)}</span>
                <EstadoTag estado={s.estado} />
              </div>
              <div className="rota">
                <span>{s.origem}</span>
                <span className="seta">→</span>
                <span>{s.destino}</span>
              </div>
              <div className="small muted">
                Carga {dataHoraPt(s.data_carga)} · {s.trator ?? "sem veículo"}
                {s.reboque ? ` + ${s.reboque}` : ""}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
