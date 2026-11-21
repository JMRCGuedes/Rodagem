import Link from "next/link";
import type { Metadata } from "next";
import { requireEscritorio } from "@/lib/auth";
import { listarAlertas } from "@/modules/alertas/queries";
import { ListaAlertas } from "@/components/ListaAlertas";
import { Topo } from "@/components/ui";

export const metadata: Metadata = { title: "Alertas" };

const HORIZONTES = [30, 60, 90];

/** UC08 — todos os prazos a vencer (documentos e tacógrafo). */
export default async function Alertas({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const u = await requireEscritorio();
  const { dias } = await searchParams;
  const horizonte = HORIZONTES.includes(Number(dias)) ? Number(dias) : 30;
  const alertas = await listarAlertas(u.empresaId, horizonte);
  const expirados = alertas.filter((a) => a.gravidade === "expirado");
  const restantes = alertas.filter((a) => a.gravidade !== "expirado");

  return (
    <>
      <Topo
        titulo="Alertas"
        subtitulo={`Documentos e descargas do tacógrafo a vencer nos próximos ${horizonte} dias.`}
      />
      <nav className="filtros" aria-label="Horizonte">
        {HORIZONTES.map((h) => (
          <Link key={h} href={`/alertas?dias=${h}`} className={`filtro${h === horizonte ? " ativo" : ""}`}>
            Próximos {h} dias
          </Link>
        ))}
      </nav>
      {expirados.length > 0 && (
        <section className="cartao">
          <h2 style={{ marginBottom: 8 }}>Expirados ({expirados.length})</h2>
          <ListaAlertas alertas={expirados} />
        </section>
      )}
      <section className="cartao">
        <h2 style={{ marginBottom: 8 }}>A vencer ({restantes.length})</h2>
        <ListaAlertas alertas={restantes} vazio={`Nada a vencer nos próximos ${horizonte} dias.`} />
      </section>
    </>
  );
}
