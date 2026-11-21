import Link from "next/link";
import type { Metadata } from "next";
import { requireEscritorio } from "@/lib/auth";
import { dataHoraPt, euros } from "@/lib/formato";
import { listarServicos } from "@/modules/servicos/queries";
import { ESTADOS_SERVICO, referencia, type EstadoServico } from "@/modules/servicos/estados";
import { EstadoTag, Topo, Vazio } from "@/components/ui";

export const metadata: Metadata = { title: "Serviços" };

const FILTROS: { valor: string; label: string }[] = [
  { valor: "abertos", label: "Abertos" },
  ...Object.entries(ESTADOS_SERVICO).map(([valor, label]) => ({ valor, label })),
  { valor: "todos", label: "Todos" },
];

export default async function Servicos({ searchParams }: { searchParams: Promise<{ estado?: string; cliente?: string }> }) {
  const u = await requireEscritorio();
  const sp = await searchParams;
  const estado = sp.estado ?? "abertos";
  const clienteId = sp.cliente && /^[0-9a-f-]{36}$/.test(sp.cliente) ? sp.cliente : undefined;
  const filtroEstado = estado === "todos" ? undefined : estado in ESTADOS_SERVICO || estado === "abertos" ? (estado as EstadoServico | "abertos") : "abertos";
  const servicos = await listarServicos(u.empresaId, { estado: filtroEstado, clienteId });

  return (
    <>
      <Topo
        titulo="Serviços"
        subtitulo={clienteId && servicos[0]?.cliente ? `Cliente: ${servicos[0].cliente}` : "Do pedido à faturação"}
        acoes={
          <Link href={clienteId ? `/servicos/novo?cliente=${clienteId}` : "/servicos/novo"} className="btn btn-primario">
            Novo serviço
          </Link>
        }
      />
      <nav className="filtros" aria-label="Filtrar por estado">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={`/servicos?estado=${f.valor}${clienteId ? `&cliente=${clienteId}` : ""}`}
            className={`filtro${estado === f.valor ? " ativo" : ""}`}
            aria-current={estado === f.valor ? "page" : undefined}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <section className="cartao">
        {servicos.length === 0 ? (
          <Vazio>
            Nenhum serviço aqui. <Link href="/servicos/novo">Criar um serviço</Link>
          </Vazio>
        ) : (
          <div className="tabela-wrap">
            <table className="responsiva">
              <thead>
                <tr>
                  <th>Ref.</th>
                  <th>Rota</th>
                  <th>Cliente</th>
                  <th>Carga</th>
                  <th>Recursos</th>
                  <th className="num">Preço</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {servicos.map((s) => (
                  <tr key={s.id}>
                    <td className="col-opc">
                      <Link href={`/servicos/${s.id}`} className="ref">
                        {referencia(s.numero)}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/servicos/${s.id}`} style={{ color: "inherit", fontWeight: 600 }}>
                        <span className="so-mobile muted">{referencia(s.numero)} · </span>
                        {s.origem} → {s.destino}
                      </Link>
                      {s.descricao_carga && <div className="muted small">{s.descricao_carga}</div>}
                    </td>
                    <td className="small">{s.cliente ?? "—"}</td>
                    <td className="small" data-label="Carga">{dataHoraPt(s.data_carga)}</td>
                    <td className="small">
                      {s.trator ? <span className="mono">{s.trator}</span> : <span className="muted">sem veículo</span>}
                      {s.reboque && <span className="mono"> + {s.reboque}</span>}
                      <div className={s.motorista ? "" : "muted"}>{s.motorista ?? "sem motorista"}</div>
                    </td>
                    <td className="num small col-opc">{euros(s.preco)}</td>
                    <td className="col-fim">
                      <EstadoTag estado={s.estado} />
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
