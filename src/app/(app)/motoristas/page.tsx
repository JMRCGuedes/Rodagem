import Link from "next/link";
import type { Metadata } from "next";
import { requireEscritorio } from "@/lib/auth";
import { listarMotoristas } from "@/modules/motoristas/queries";
import { Topo, ValidadeTag, Vazio } from "@/components/ui";

export const metadata: Metadata = { title: "Motoristas" };

export default async function Motoristas({ searchParams }: { searchParams: Promise<{ todos?: string }> }) {
  const u = await requireEscritorio();
  const { todos } = await searchParams;
  const motoristas = await listarMotoristas(u.empresaId, { incluirInativos: todos === "1" });

  return (
    <>
      <Topo
        titulo="Motoristas"
        subtitulo={`${motoristas.length} ${motoristas.length === 1 ? "motorista" : "motoristas"}`}
        acoes={
          <>
            <Link href={todos === "1" ? "/motoristas" : "/motoristas?todos=1"} className="btn btn-secundario">
              {todos === "1" ? "Esconder inativos" : "Mostrar inativos"}
            </Link>
            <Link href="/motoristas/novo" className="btn btn-primario">
              Adicionar motorista
            </Link>
          </>
        }
      />
      <section className="cartao">
        {motoristas.length === 0 ? (
          <Vazio>
            Ainda não há motoristas. <Link href="/motoristas/novo">Adicionar o primeiro</Link>
          </Vazio>
        ) : (
          <div className="tabela-wrap">
            <table className="responsiva">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Carta</th>
                  <th>App</th>
                  <th>Próxima validade</th>
                </tr>
              </thead>
              <tbody>
                {motoristas.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link href={`/motoristas/${m.id}`}>
                        <strong>{m.nome}</strong>
                      </Link>
                      {!m.ativo && <span className="tag tag-neutro" style={{ marginLeft: 8 }}>Inativo</span>}
                    </td>
                    <td className="small">{m.telefone ? <a href={`tel:${m.telefone}`}>{m.telefone}</a> : "—"}</td>
                    <td className="small" data-label="Carta">{m.categorias_carta ?? "—"}</td>
                    <td className="col-opc">{m.tem_conta ? <span className="tag tag-ok">Com conta</span> : <span className="muted small">—</span>}</td>
                    <td className="col-fim">
                      <ValidadeTag data={m.proxima_validade} />
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
