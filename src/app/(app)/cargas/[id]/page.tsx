import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEscritorio } from "@/lib/auth";
import { euros, numeroPt } from "@/lib/formato";
import { diaCurto } from "@/lib/datas";
import { orcamentoGeocode } from "@/lib/geo";
import { CARROCARIAS, type Carrocaria } from "@/lib/carrocaria";
import { carregarContexto } from "@/modules/planeamento/contexto";
import { ESTADOS_OFERTA, obterOferta, type EstadoOferta } from "@/modules/cargas/queries";
import { avaliarOferta, LIMITES } from "@/modules/cargas/pontuacao";
import { linkEmail, linkWhatsApp, textoProposta } from "@/modules/cargas/proposta";
import { aceitarOferta, apagarOferta, guardarNotasOferta, mudarEstadoOferta } from "@/modules/cargas/actions";
import { ActionForm } from "@/components/ActionForm";
import { CopiarTexto } from "@/components/CopiarTexto";
import { Topo } from "@/components/ui";

const ACAO: Partial<Record<EstadoOferta, string>> = {
  contactada: "Marcar como contactada",
  proposta: "Proposta enviada",
  descartada: "Descartar",
  nova: "Voltar a Novas",
};
const SEGUINTES: Record<EstadoOferta, EstadoOferta[]> = {
  nova: ["contactada", "proposta", "descartada"],
  contactada: ["proposta", "descartada"],
  proposta: ["descartada"],
  aceite: [],
  descartada: ["nova"],
};

export default async function OfertaDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireEscritorio();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const o = await obterOferta(u.empresaId, id);
  if (!o) notFound();
  const ctx = await carregarContexto(u.empresaId);
  const a = await avaliarOferta(ctx, o, orcamentoGeocode(6));

  const mensagem = textoProposta(o, { assinatura: u.nome.split(" ")[0] ?? u.nome, empresa: u.empresaNome });
  const whatsapp = linkWhatsApp(o.contacto_telefone, mensagem, o.idioma);
  const email = linkEmail(o.contacto_email, o, mensagem);
  const corNota = a.nota >= 75 ? "nota-boa" : a.nota >= 50 ? "nota-media" : "nota-fraca";
  const fechada = o.estado === "aceite";

  return (
    <>
      <Topo
        sobretitulo={`${o.fonte === "wtransnet" ? "Wtransnet" : o.fonte === "direto" ? "Cliente direto" : o.fonte}${o.empresa_anunciante ? ` · ${o.empresa_anunciante}` : ""}`}
        titulo={`${o.origem} → ${o.destino}`}
        migalhas={[{ href: `/cargas?estado=${o.estado}`, label: "Assistente de cargas" }]}
        acoes={<span className="tag tag-neutro">{ESTADOS_OFERTA[o.estado]}</span>}
      />

      <div className="grelha-2">
        <section className="cartao">
          <div className="cartao-cab">
            <h2>Avaliação</h2>
            <span className={`nota nota-grande ${corNota}`} aria-label={`Pontuação ${a.nota} em 100`}>
              {a.nota}
            </span>
          </div>
          <ul className="razoes">
            {a.razoes.map((r) => (
              <li key={r.texto} className={r.tipo === "bom" ? "razao-bom" : "razao-atencao"}>
                <span aria-hidden="true">{r.tipo === "bom" ? "✓" : "!"}</span>
                {r.texto}
              </li>
            ))}
          </ul>
          <dl className="dl" style={{ marginTop: 16 }}>
            <dt>Datas</dt>
            <dd>
              {o.data_carga ? diaCurto(o.data_carga) : "sem data"}
              {o.data_entrega ? ` → ${diaCurto(o.data_entrega)}` : ""}
            </dd>
            <dt>Mercadoria</dt>
            <dd>
              {o.descricao_carga ?? "—"}
              {o.peso_kg ? ` · ${numeroPt(o.peso_kg, " kg")}` : ""}
              {o.carrocaria ? ` · ${CARROCARIAS[o.carrocaria as Carrocaria] ?? o.carrocaria}` : ""}
            </dd>
            <dt>Preço</dt>
            <dd>
              {euros(o.preco)}
              {a.eurKm !== null && <span className="muted"> · {a.eurKm.toFixed(2).replace(".", ",")} €/km</span>}
              {a.km !== null && <span className="muted"> · ≈ {a.km} km</span>}
            </dd>
            <dt>Contacto</dt>
            <dd>
              {[o.contacto_nome, o.contacto_telefone, o.contacto_email].filter(Boolean).join(" · ") || "—"}
            </dd>
          </dl>
          <p className="small muted" style={{ marginTop: 14 }}>
            Pontuação: até 40 pontos pelo €/km ({LIMITES.eurKmMin.toFixed(2).replace(".", ",")} a {LIMITES.eurKmMax.toFixed(2).replace(".", ",")} €/km), até 35
            pelos km em vazio, 15 por haver camião livre e compatível e 10 por documentos em dia. Distâncias aproximadas.
          </p>
        </section>

        <section className="cartao">
          {fechada ? (
            <>
              <h2 style={{ marginBottom: 8 }}>Carga aceite</h2>
              <p className="muted" style={{ marginBottom: 12 }}>
                Esta oferta já deu origem a um serviço.
              </p>
              {o.servico_id && (
                <Link href={`/servicos/${o.servico_id}`} className="btn btn-primario">
                  Abrir serviço
                </Link>
              )}
            </>
          ) : (
            <>
              <h2 style={{ marginBottom: 10 }}>Proposta pronta a enviar</h2>
              <div className="proposta">{mensagem}</div>
              <div className="acoes" style={{ marginTop: 12 }}>
                {whatsapp && (
                  <a href={whatsapp} target="_blank" rel="noopener" className="btn btn-whatsapp">
                    Abrir no WhatsApp
                  </a>
                )}
                {email && (
                  <a href={email} className="btn btn-secundario">
                    Enviar por email
                  </a>
                )}
                {o.contacto_telefone && (
                  <a href={`tel:${o.contacto_telefone.replace(/[^\d+]/g, "")}`} className="btn btn-secundario">
                    Ligar
                  </a>
                )}
                <CopiarTexto texto={mensagem} />
              </div>
              <p className="small muted" style={{ marginTop: 8 }}>
                O envio é sempre feito por ti; depois marca o estado abaixo.
              </p>

              <div className="acoes separador">
                {SEGUINTES[o.estado].map((e) => (
                  <ActionForm
                    key={e}
                    action={mudarEstadoOferta.bind(null, o.id, e)}
                    submitLabel={ACAO[e] ?? e}
                    variante={e === "descartada" ? "perigo" : "secundario"}
                    className="form-inline"
                  >
                    {null}
                  </ActionForm>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {!fechada && (
        <div className="grelha-2" style={{ marginTop: 16 }}>
          <section className="cartao">
            <h2 style={{ marginBottom: 6 }}>Fechei a carga</h2>
            <p className="muted small" style={{ marginBottom: 12 }}>
              Cria o serviço{o.empresa_anunciante ? ` e o cliente ${o.empresa_anunciante}` : ""}. Com camião escolhido, fica já planeado com o motorista habitual.
            </p>
            <ActionForm action={aceitarOferta.bind(null, o.id)} submitLabel="Aceitar e criar serviço">
              <div className="campos">
                <label>
                  Camião
                  <select name="veiculo_id" defaultValue={a.melhor?.veiculo.id ?? ""}>
                    <option value="">Decidir depois</option>
                    {a.alternativas.map((s) => (
                      <option key={s.veiculo.id} value={s.veiculo.id}>
                        {s.veiculo.matricula}
                        {s.veiculo.motorista ? ` · ${s.veiculo.motorista}` : ""}
                        {s.kmVazio !== null ? ` · ${s.kmVazio} km vazio` : ""}
                        {s.disponivel ? "" : " · ocupado"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Preço fechado (€)
                  <input name="preco" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={o.preco ?? ""} />
                </label>
              </div>
            </ActionForm>
          </section>

          <section className="cartao">
            <h2 style={{ marginBottom: 10 }}>Notas da negociação</h2>
            <ActionForm action={guardarNotasOferta.bind(null, o.id)} submitLabel="Guardar" variante="secundario">
              <label>
                Notas
                <textarea name="notas" defaultValue={o.notas ?? ""} placeholder="Ex.: pediu 900 €, contraproposta de 950 € às 10h" />
              </label>
              <label>
                Preço em negociação (€)
                <input name="preco" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={o.preco ?? ""} />
              </label>
            </ActionForm>
            {o.texto_original && (
              <details style={{ marginTop: 14 }}>
                <summary>Texto original da oferta</summary>
                <pre className="texto-original">{o.texto_original}</pre>
              </details>
            )}
            <div className="separador">
              <ActionForm action={apagarOferta.bind(null, o.id)} submitLabel="Apagar oferta" variante="perigo" confirmar="Apagar esta oferta?">
                {null}
              </ActionForm>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
