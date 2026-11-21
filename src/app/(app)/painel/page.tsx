import Link from "next/link";
import type { Metadata } from "next";
import { requireEscritorio } from "@/lib/auth";
import { query } from "@/lib/db";
import { dataHoraPt } from "@/lib/formato";
import { listarAlertas } from "@/modules/alertas/queries";
import { contagemPorEstado, listarServicos } from "@/modules/servicos/queries";
import { referencia } from "@/modules/servicos/estados";
import { ListaAlertas } from "@/components/ListaAlertas";
import { EstadoTag, Topo, Vazio } from "@/components/ui";

export const metadata: Metadata = { title: "Painel" };

/** UC01 — o painel do dia: serviços ativos, veículos parados e prazos a vencer. */
export default async function Painel() {
  const u = await requireEscritorio();
  const [alertas, contagem, abertos, parados] = await Promise.all([
    listarAlertas(u.empresaId),
    contagemPorEstado(u.empresaId),
    listarServicos(u.empresaId, { estado: "abertos" }),
    query<{ id: string; matricula: string; estado: string }>(
      "SELECT id, matricula, estado FROM veiculos WHERE empresa_id=$1 AND estado='oficina' ORDER BY matricula",
      [u.empresaId]
    ),
  ]);
  const expirados = alertas.filter((a) => a.gravidade === "expirado").length;
  const primeiroNome = u.nome.split(" ")[0];

  return (
    <>
      <Topo
        titulo={`Bom dia, ${primeiroNome}`}
        subtitulo={u.empresaNome}
        acoes={
          <Link href="/servicos/novo" className="btn btn-primario">
            Novo serviço
          </Link>
        }
      />

      <div className="kpis">
        <Link href="/servicos?estado=em_curso" className="kpi">
          <div className="kpi-valor">{contagem.em_curso ?? 0}</div>
          <div className="kpi-rotulo">Em curso</div>
        </Link>
        <Link href="/servicos?estado=planeado" className="kpi">
          <div className="kpi-valor">{contagem.planeado ?? 0}</div>
          <div className="kpi-rotulo">Planeados</div>
        </Link>
        <Link href="/servicos?estado=pedido" className="kpi">
          <div className="kpi-valor">{contagem.pedido ?? 0}</div>
          <div className="kpi-rotulo">Pedidos por planear</div>
        </Link>
        <Link href="/alertas" className={`kpi${expirados ? " alerta" : ""}`}>
          <div className="kpi-valor">{expirados}</div>
          <div className="kpi-rotulo">Prazos expirados</div>
        </Link>
      </div>

      <div className="grelha-2">
        <section className="cartao">
          <div className="cartao-cab">
            <h2>Prazos nos próximos 30 dias</h2>
            <Link href="/alertas" className="small">
              Ver todos
            </Link>
          </div>
          <ListaAlertas alertas={alertas.slice(0, 8)} />
        </section>

        <div className="pilha">
          <section className="cartao">
            <div className="cartao-cab">
              <h2>Serviços abertos</h2>
              <Link href="/servicos" className="small">
                Ver todos
              </Link>
            </div>
            {abertos.length === 0 ? (
              <Vazio>Sem serviços abertos.</Vazio>
            ) : (
              <div className="tabela-wrap">
                <table>
                  <tbody>
                    {abertos.slice(0, 8).map((s) => (
                      <tr key={s.id}>
                        <td className="mono">
                          <Link href={`/servicos/${s.id}`}>{referencia(s.numero)}</Link>
                        </td>
                        <td>
                          {s.origem} → {s.destino}
                          <div className="muted small">
                            {s.trator ?? "sem veículo"} · {s.motorista ?? "sem motorista"}
                          </div>
                        </td>
                        <td className="small muted">{dataHoraPt(s.data_carga)}</td>
                        <td>
                          <EstadoTag estado={s.estado} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="cartao">
            <h2 style={{ marginBottom: 10 }}>Veículos na oficina</h2>
            {parados.length === 0 ? (
              <p className="muted small">Nenhum veículo parado.</p>
            ) : (
              <div className="acoes">
                {parados.map((v) => (
                  <Link key={v.id} href={`/frota/${v.id}`} className="tag tag-aviso mono">
                    {v.matricula}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
