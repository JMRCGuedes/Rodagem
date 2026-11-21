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

function saudacao() {
  const hora = Number(new Intl.DateTimeFormat("pt-PT", { hour: "numeric", hour12: false, timeZone: "Europe/Lisbon" }).format(new Date()));
  if (hora < 13) return "Bom dia";
  if (hora < 20) return "Boa tarde";
  return "Boa noite";
}

function hojePorExtenso() {
  const t = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Lisbon" }).format(new Date());
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** UC01 — o painel do dia: serviços ativos, veículos parados e prazos a vencer. */
export default async function Painel() {
  const u = await requireEscritorio();
  const [alertas, contagem, abertos, parados] = await Promise.all([
    listarAlertas(u.empresaId),
    contagemPorEstado(u.empresaId),
    listarServicos(u.empresaId, { estado: "abertos" }),
    query<{ id: string; matricula: string }>(
      "SELECT id, matricula FROM veiculos WHERE empresa_id=$1 AND estado='oficina' ORDER BY matricula",
      [u.empresaId]
    ),
  ]);
  const expirados = alertas.filter((a) => a.gravidade === "expirado").length;

  const kpis = [
    { href: "/servicos?estado=em_curso", rotulo: "Em curso", valor: contagem.em_curso ?? 0, sub: "camiões na estrada", cor: "#e8a317" },
    { href: "/servicos?estado=planeado", rotulo: "Planeados", valor: contagem.planeado ?? 0, sub: "à espera de carga", cor: "#2453c7" },
    { href: "/servicos?estado=pedido", rotulo: "Por planear", valor: contagem.pedido ?? 0, sub: "pedidos de clientes", cor: "#94a3b8" },
    { href: "/alertas", rotulo: "Prazos expirados", valor: expirados, sub: expirados ? "precisa de atenção" : "tudo em dia", cor: "#d92d20", alerta: expirados > 0 },
  ];

  return (
    <>
      <Topo
        sobretitulo={hojePorExtenso()}
        titulo={`${saudacao()}, ${u.nome.split(" ")[0]}`}
        acoes={
          <Link href="/servicos/novo" className="btn btn-primario">
            + Novo serviço
          </Link>
        }
      />

      <div className="kpis">
        {kpis.map((k) => (
          <Link key={k.rotulo} href={k.href} className={`kpi${k.alerta ? " alerta" : ""}`}>
            <div className="kpi-rotulo">
              <span className="ponto" style={{ background: k.cor }} aria-hidden="true" />
              {k.rotulo}
            </div>
            <div className="kpi-valor">{k.valor}</div>
            <div className="kpi-sub">{k.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grelha-2">
        <section className="cartao">
          <div className="cartao-cab">
            <h2>Prazos nos próximos 30 dias</h2>
            <Link href="/alertas" className="small">
              Ver todos
            </Link>
          </div>
          <ListaAlertas alertas={alertas.slice(0, 6)} />
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
                <table className="responsiva">
                  <thead>
                    <tr>
                      <th>Ref.</th>
                      <th>Rota</th>
                      <th>Camião · motorista</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abertos.slice(0, 6).map((s) => (
                      <tr key={s.id}>
                        <td className="col-opc">
                          <Link href={`/servicos/${s.id}`} className="ref">
                            {referencia(s.numero)}
                          </Link>
                        </td>
                        <td>
                          <Link href={`/servicos/${s.id}`} style={{ color: "inherit", fontWeight: 500 }}>
                            {s.origem} → {s.destino}
                          </Link>
                          <div className="muted small">Carga {dataHoraPt(s.data_carga)}</div>
                        </td>
                        <td className="small" style={{ color: "var(--ink-2)" }}>
                          {s.trator ?? "Por atribuir"}
                          {s.motorista && ` · ${s.motorista}`}
                        </td>
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

          {parados.length > 0 && (
            <section className="cartao">
              <h2 style={{ marginBottom: 12 }}>Veículos na oficina</h2>
              <div className="acoes">
                {parados.map((v) => (
                  <Link key={v.id} href={`/frota/${v.id}`} className="tag tag-aviso mono">
                    {v.matricula}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
