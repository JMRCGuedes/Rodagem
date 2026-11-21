"use client";

import Link from "next/link";
import { useState, useTransition, type DragEvent } from "react";
import { atribuirNoQuadro, desatribuirNoQuadro, type ResultadoQuadro } from "@/modules/planeamento/actions";
import type { QuadroDados } from "@/modules/planeamento/quadro";

const ESTILO_ESTADO: Record<string, string> = {
  em_curso: "bloco-curso",
  planeado: "bloco-planeado",
  entregue: "bloco-entregue",
  faturado: "bloco-entregue",
  oficina: "bloco-parado",
};

export function Quadro({ dados }: { dados: QuadroDados }) {
  const [pendente, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [arrastar, setArrastar] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [escolha, setEscolha] = useState<Record<string, string>>({});

  function executar(acao: () => Promise<ResultadoQuadro>, repetirForcado?: () => Promise<ResultadoQuadro>) {
    startTransition(async () => {
      let r = await acao();
      if (r.avisos?.length && repetirForcado) {
        const ok = window.confirm(`Atenção:\n\n• ${r.avisos.join("\n• ")}\n\nPlanear mesmo assim?`);
        if (!ok) {
          setMensagem({ tipo: "erro", texto: "Planeamento cancelado." });
          return;
        }
        r = await repetirForcado();
      }
      if (r.erro) setMensagem({ tipo: "erro", texto: r.erro });
      else if (r.ok) setMensagem({ tipo: "ok", texto: r.ok });
    });
  }

  function atribuir(servicoId: string, veiculoId: string, dia: string | null) {
    executar(
      () => atribuirNoQuadro(servicoId, veiculoId, dia, false),
      () => atribuirNoQuadro(servicoId, veiculoId, dia, true)
    );
  }

  function diaNaPosicao(e: DragEvent<HTMLDivElement>) {
    const area = e.currentTarget.querySelector<HTMLElement>("[data-dias]");
    if (!area) return null;
    const r = area.getBoundingClientRect();
    const idx = Math.floor(((e.clientX - r.left) / r.width) * 7);
    return dados.dias[Math.min(6, Math.max(0, idx))]?.iso ?? null;
  }

  function onDrop(e: DragEvent<HTMLDivElement>, veiculoId: string) {
    e.preventDefault();
    setAlvo(null);
    const servicoId = e.dataTransfer.getData("text/plain") || arrastar;
    setArrastar(null);
    if (!servicoId) return;
    atribuir(servicoId, veiculoId, diaNaPosicao(e));
  }

  function inicioArrasto(e: DragEvent<HTMLElement>, servicoId: string) {
    e.dataTransfer.setData("text/plain", servicoId);
    e.dataTransfer.effectAllowed = "move";
    setArrastar(servicoId);
  }

  return (
    <div className="plan" aria-busy={pendente}>
      {mensagem && (
        <p className={`alerta ${mensagem.tipo === "ok" ? "alerta-ok" : "alerta-erro"}`} role="status" style={{ marginBottom: 14 }}>
          {mensagem.texto}
        </p>
      )}

      <div className="plan-layout">
        <section className="plan-pendentes" aria-label="Por planear">
          <div className="plan-pendentes-cab">
            <h2>
              Por planear <span className="muted">{dados.pendentes.length}</span>
            </h2>
            <span className="ajuda so-desktop">arrasta para o quadro</span>
          </div>

          {dados.pendentes.length === 0 && <p className="vazio">Nada por planear.</p>}

          {dados.pendentes.map((p) => (
            <article
              key={p.id}
              className={`plan-cartao${p.sugestao ? " com-sugestao" : ""}`}
              draggable
              onDragStart={(e) => inicioArrasto(e, p.id)}
              onDragEnd={() => setArrastar(null)}
            >
              <div className="plan-cartao-topo">
                <span>
                  {p.ref}
                  {p.cliente ? ` · ${p.cliente}` : ""}
                </span>
                <span>{p.quando}</span>
              </div>
              <Link href={`/servicos/${p.id}`} className="plan-cartao-rota">
                {p.rota}
              </Link>
              {p.carga && <div className="muted small">{p.carga}</div>}

              {p.sugestao && (
                <div className="plan-sugestao">
                  <div className="plan-sugestao-titulo">Sugestão</div>
                  <div>
                    <strong>{p.sugestao.matricula}</strong>
                    {p.sugestao.motorista && ` · ${p.sugestao.motorista}`}
                  </div>
                  {p.sugestao.razoes.map((r) => (
                    <div key={r} className="small">
                      {r}
                    </div>
                  ))}
                  {p.sugestao.avisos.map((a) => (
                    <div key={a} className="small" style={{ color: "var(--warn)" }}>
                      {a}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-primario btn-pequeno"
                    style={{ marginTop: 8 }}
                    disabled={pendente}
                    onClick={() => atribuir(p.id, p.sugestao!.veiculoId, null)}
                  >
                    Atribuir
                  </button>
                </div>
              )}

              <div className="plan-opcoes">
                <label className="sr-only" htmlFor={`op-${p.id}`}>
                  Atribuir {p.ref} a
                </label>
                <select
                  id={`op-${p.id}`}
                  value={escolha[p.id] ?? ""}
                  onChange={(e) => setEscolha((x) => ({ ...x, [p.id]: e.target.value }))}
                >
                  <option value="">{p.sugestao ? "Outro camião…" : "Escolher camião…"}</option>
                  {p.opcoes.map((o) => (
                    <option key={o.veiculoId} value={o.veiculoId}>
                      {o.texto}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secundario btn-pequeno"
                  disabled={pendente || !escolha[p.id]}
                  onClick={() => atribuir(p.id, escolha[p.id]!, null)}
                >
                  Atribuir
                </button>
              </div>
            </article>
          ))}

          {dados.retornos.slice(0, 3).map((r) => (
            <div key={`${r.matricula}-${r.dia}`} className="plan-retorno">
              <strong>Carga de retorno</strong>
              <div>
                {r.matricula} fica livre em <strong>{r.local}</strong>.
              </div>
              <Link href={`/cargas?origem=${encodeURIComponent(r.local)}&dia=${r.dia}`} className="btn btn-secundario btn-pequeno" style={{ marginTop: 8 }}>
                Procurar no assistente de cargas
              </Link>
            </div>
          ))}
        </section>

        <section className="plan-grelha cartao" aria-label="Quadro da semana">
          <div className="plan-scroll">
            <div className="plan-tabela">
              <div className="plan-linha plan-cabecalho">
                <div className="plan-veiculo muted small">Camião · motorista</div>
                <div className="plan-dias">
                  {dados.dias.map((d) => (
                    <div key={d.iso} className={`plan-dia${d.hoje ? " hoje" : ""}${d.fds ? " fds" : ""}`}>
                      <span>{d.semana}</span>
                      <strong>{d.dia}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {dados.linhas.length === 0 && (
                <p className="vazio">
                  Sem tratores ou rígidos ativos. <Link href="/frota/novo">Adicionar veículo</Link>
                </p>
              )}

              {dados.linhas.map((l) => (
                <div
                  key={l.id}
                  className={`plan-linha${alvo === l.id ? " alvo" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (alvo !== l.id) setAlvo(l.id);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setAlvo(null);
                  }}
                  onDrop={(e) => onDrop(e, l.id)}
                >
                  <div className="plan-veiculo">
                    <Link href={`/frota/${l.id}`} className="plan-matricula">
                      {l.matricula}
                      {l.aviso && <span className="plan-aviso" title={l.aviso} aria-label={l.aviso} />}
                    </Link>
                    <div className="small muted">{l.motorista ?? "sem motorista habitual"}</div>
                  </div>
                  <div className="plan-dias" data-dias>
                    {dados.dias.map((d) => (
                      <div key={d.iso} className={`plan-celula${d.fds ? " fds" : ""}`} />
                    ))}
                    {l.itens.map((it) =>
                      it.tipo === "servico" ? (
                        <div
                          key={it.chave}
                          className={`plan-bloco ${ESTILO_ESTADO[it.estado ?? ""] ?? "bloco-planeado"}`}
                          style={{ gridColumn: `${it.col + 1} / span ${it.span}` }}
                          draggable={it.estado === "planeado"}
                          onDragStart={(e) => it.servicoId && inicioArrasto(e, it.servicoId)}
                        >
                          <Link href={`/servicos/${it.servicoId}`} className="plan-bloco-titulo">
                            {it.titulo}
                          </Link>
                          <span className="plan-bloco-sub">{it.sub}</span>
                          {it.estado === "planeado" && it.servicoId && (
                            <button
                              type="button"
                              className="plan-bloco-tirar"
                              aria-label="Tirar do quadro"
                              title="Tirar do quadro"
                              disabled={pendente}
                              onClick={() => executar(() => desatribuirNoQuadro(it.servicoId!))}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ) : (
                        <div
                          key={it.chave}
                          className={`plan-bloco ${it.estado === "oficina" ? "bloco-parado" : "bloco-livre"}`}
                          style={{ gridColumn: `${it.col + 1} / span ${it.span}` }}
                        >
                          <span className="plan-bloco-titulo">{it.titulo}</span>
                          {it.retorno ? (
                            <Link href={`/cargas?origem=${encodeURIComponent(it.retorno.local)}&dia=${it.retorno.dia}`} className="plan-bloco-sub">
                              {it.sub} ›
                            </Link>
                          ) : (
                            <span className="plan-bloco-sub">{it.sub}</span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="plan-legenda">
            <span>
              <i className="bloco-curso" /> Em curso
            </span>
            <span>
              <i className="bloco-planeado" /> Planeado
            </span>
            <span>
              <i className="bloco-livre" /> Livre · onde fica
            </span>
            <span>
              <i className="bloco-parado" /> Oficina
            </span>
            <span>
              <i className="plan-aviso" /> Documento expirado
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
