import Link from "next/link";
import type { Metadata } from "next";
import { requireFrota } from "@/lib/auth";
import { eEscritorio } from "@/lib/perfis";
import { numeroPt } from "@/lib/formato";
import { ESTADOS_VEICULO, listarVeiculos, TIPOS_VEICULO } from "@/modules/frota/queries";
import { Topo, ValidadeTag, Vazio } from "@/components/ui";

export const metadata: Metadata = { title: "Frota" };

export default async function Frota({ searchParams }: { searchParams: Promise<{ todos?: string }> }) {
  const u = await requireFrota();
  const { todos } = await searchParams;
  const veiculos = await listarVeiculos(u.empresaId, { incluirInativos: todos === "1" });

  return (
    <>
      <Topo
        titulo="Frota"
        subtitulo={`${veiculos.length} ${veiculos.length === 1 ? "veículo" : "veículos"}${todos === "1" ? "" : " ativos ou na oficina"}`}
        acoes={
          <>
            <Link href={todos === "1" ? "/frota" : "/frota?todos=1"} className="btn btn-secundario">
              {todos === "1" ? "Esconder inativos" : "Mostrar inativos"}
            </Link>
            {eEscritorio(u) && (
              <Link href="/frota/novo" className="btn btn-primario">
                Adicionar veículo
              </Link>
            )}
          </>
        }
      />
      <section className="cartao">
        {veiculos.length === 0 ? (
          <Vazio>
            Ainda não há veículos. {eEscritorio(u) && <Link href="/frota/novo">Adicionar o primeiro</Link>}
          </Vazio>
        ) : (
          <div className="tabela-wrap">
            <table className="responsiva">
              <thead>
                <tr>
                  <th>Matrícula</th>
                  <th>Tipo</th>
                  <th>Marca · motorista</th>
                  <th className="num">Km</th>
                  <th>Estado</th>
                  <th>Próxima validade</th>
                </tr>
              </thead>
              <tbody>
                {veiculos.map((v) => (
                  <tr key={v.id}>
                    <td className="mono">
                      <Link href={`/frota/${v.id}`}>
                        <strong>{v.matricula}</strong>
                      </Link>
                    </td>
                    <td className="small muted">{TIPOS_VEICULO[v.tipo]}</td>
                    <td className="small">
                      {[v.marca, v.modelo].filter(Boolean).join(" ") || "—"}
                      {v.motorista_habitual && <div className="muted">{v.motorista_habitual}</div>}
                    </td>
                    <td className="num col-opc" data-label="Km">{numeroPt(v.km)}</td>
                    <td className="col-fim">
                      <span className={`tag ${v.estado === "ativo" ? "tag-ok" : v.estado === "oficina" ? "tag-aviso" : "tag-neutro"}`}>
                        {ESTADOS_VEICULO[v.estado]}
                      </span>
                    </td>
                    <td>
                      <ValidadeTag data={v.proxima_validade} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
