import Link from "next/link";
import type { Metadata } from "next";
import { requireMotorista } from "@/lib/auth";
import { dataHoraPt } from "@/lib/formato";
import { servicosDoMotorista } from "@/modules/servicos/queries";
import { referencia } from "@/modules/servicos/estados";
import { CartaoServicoMotorista } from "@/components/motorista/CartaoServico";
import { EstadoTag, Topo } from "@/components/ui";

export const metadata: Metadata = { title: "Hoje" };

function hojePorExtenso() {
  const t = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Lisbon" }).format(new Date());
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** UC06 — o motorista abre a app e vê logo o serviço em que está (ou o próximo). */
export default async function Hoje({ searchParams }: { searchParams: Promise<{ entregue?: string }> }) {
  const u = await requireMotorista();
  const { entregue } = await searchParams;
  const servicos = await servicosDoMotorista(u.empresaId, u.motoristaId);
  const ativos = servicos.filter((s) => s.estado === "em_curso" || s.estado === "planeado");
  const atual = ativos[0];
  const seguintes = ativos.slice(1);
  const feitos = servicos.filter((s) => s.estado === "entregue");

  return (
    <div className="motorista">
      <Topo sobretitulo={hojePorExtenso()} titulo={`Olá, ${u.nome.split(" ")[0]}`} />

      {entregue && (
        <p className="alerta alerta-ok" role="status">
          Entrega de {referencia(Number(entregue))} registada. Obrigado!
        </p>
      )}

      {atual ? (
        <CartaoServicoMotorista s={atual} />
      ) : (
        <section className="cartao">
          <p className="vazio">Não tens serviços atribuídos de momento.</p>
        </section>
      )}

      {seguintes.length > 0 && (
        <section>
          <h2 className="motorista-secao">A seguir</h2>
          <div className="motorista-lista">
            {seguintes.map((s) => (
              <Link key={s.id} href={`/motorista/${s.id}`} className="cartao servico-cartao">
                <div className="cartao-cab" style={{ marginBottom: 0 }}>
                  <span className="muted small">{referencia(s.numero)}</span>
                  <EstadoTag estado={s.estado} />
                </div>
                <div className="rota">
                  <span>{s.origem}</span>
                  <span className="seta">→</span>
                  <span>{s.destino}</span>
                </div>
                <div className="small muted">Carga {dataHoraPt(s.data_carga)}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {feitos.length > 0 && (
        <section>
          <h2 className="motorista-secao">Entregues nos últimos dias</h2>
          <div className="motorista-lista">
            {feitos.map((s) => (
              <Link key={s.id} href={`/motorista/${s.id}`} className="cartao servico-cartao">
                <div className="cartao-cab" style={{ marginBottom: 0 }}>
                  <span className="muted small">{referencia(s.numero)}</span>
                  <EstadoTag estado={s.estado} />
                </div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>
                  {s.origem} → {s.destino}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
