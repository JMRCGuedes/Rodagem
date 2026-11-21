import Link from "next/link";
import type { Metadata } from "next";
import { requireEscritorio } from "@/lib/auth";
import { euros } from "@/lib/formato";
import { diaCurto } from "@/lib/datas";
import { orcamentoGeocode } from "@/lib/geo";
import { iaConfigurada, nomeFornecedorIA } from "@/lib/ia";
import { carregarContexto } from "@/modules/planeamento/contexto";
import { contagemOfertas, ESTADOS_OFERTA, listarOfertas, type EstadoOferta } from "@/modules/cargas/queries";
import { avaliarOferta } from "@/modules/cargas/pontuacao";
import { NovaOferta } from "@/components/cargas/NovaOferta";
import { Topo, Vazio } from "@/components/ui";

export const metadata: Metadata = { title: "Assistente de cargas" };

function corNota(n: number) {
  return n >= 75 ? "nota-boa" : n >= 50 ? "nota-media" : "nota-fraca";
}

export default async function Cargas({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; origem?: string; dia?: string }>;
}) {
  const u = await requireEscritorio();
  const sp = await searchParams;
  const estado: EstadoOferta = sp.estado && sp.estado in ESTADOS_OFERTA ? (sp.estado as EstadoOferta) : "nova";
  const origem = sp.origem?.slice(0, 120);
  const dia = sp.dia && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) ? sp.dia : undefined;

  const [ofertas, contagem, ctx] = await Promise.all([listarOfertas(u.empresaId, estado), contagemOfertas(u.empresaId), carregarContexto(u.empresaId)]);
  const podeGeocodificar = orcamentoGeocode(6);
  const avaliadas: { o: (typeof ofertas)[number]; a: Awaited<ReturnType<typeof avaliarOferta>> }[] = [];
  for (const o of ofertas.slice(0, 40)) {
    avaliadas.push({ o, a: await avaliarOferta(ctx, o, podeGeocodificar) });
  }
  if (estado === "nova") avaliadas.sort((x, y) => y.a.nota - x.a.nota);

  return (
    <>
      <Topo
        sobretitulo="Ofertas da Wtransnet e de clientes diretos"
        titulo="Assistente de cargas"
      />

      <nav className="filtros" aria-label="Funil">
        {(Object.keys(ESTADOS_OFERTA) as EstadoOferta[]).map((e) => (
          <Link key={e} href={`/cargas?estado=${e}`} className={`filtro${e === estado ? " ativo" : ""}`} aria-current={e === estado ? "page" : undefined}>
            {ESTADOS_OFERTA[e]} <strong style={{ marginLeft: 6 }}>{contagem[e] ?? 0}</strong>
          </Link>
        ))}
      </nav>

      {origem && (
        <p className="alerta alerta-info" style={{ marginBottom: 14 }}>
          À procura de carga de retorno a partir de <strong>{origem}</strong>
          {dia ? ` a ${diaCurto(dia)}` : ""}. Procura na Wtransnet cargas com essa origem e cola-as aqui.
        </p>
      )}

      <NovaOferta iaLigada={iaConfigurada()} iaNome={nomeFornecedorIA()} origemSugerida={origem} diaSugerido={dia} />

      <section className="cartao">
        <div className="cartao-cab">
          <h2>{estado === "nova" ? "Melhores para a tua frota" : ESTADOS_OFERTA[estado]}</h2>
          {estado === "nova" && <span className="small muted">ordenadas pela pontuação</span>}
        </div>
        {avaliadas.length === 0 ? (
          <Vazio>{estado === "nova" ? "Ainda não há ofertas. Cola a primeira acima." : "Nada aqui."}</Vazio>
        ) : (
          <ul className="lista-ofertas">
            {avaliadas.map(({ o, a }) => (
              <li key={o.id}>
                <Link href={`/cargas/${o.id}`} className="oferta-linha">
                  <span className={`nota ${corNota(a.nota)}`} aria-label={`Pontuação ${a.nota} em 100`}>
                    {a.nota}
                  </span>
                  <span className="oferta-principal">
                    <strong>
                      {o.origem} → {o.destino}
                    </strong>
                    <span className="muted small">
                      {o.data_carga ? diaCurto(o.data_carga) : "sem data"}
                      {o.data_entrega ? ` → ${diaCurto(o.data_entrega)}` : ""}
                      {o.descricao_carga ? ` · ${o.descricao_carga}` : ""}
                    </span>
                    {a.retorno && <span className="tag tag-aviso" style={{ marginTop: 4, alignSelf: "flex-start" }}>Carga de retorno</span>}
                  </span>
                  <span className="oferta-num">
                    <strong>{euros(o.preco)}</strong>
                    <span className="muted small">{a.eurKm !== null ? `${a.eurKm.toFixed(2).replace(".", ",")} €/km` : a.km ? `${a.km} km` : "—"}</span>
                  </span>
                  <span className="oferta-num">
                    <span className="muted small">Vazio</span>
                    <strong className={a.melhor?.kmVazio !== null && a.melhor?.kmVazio !== undefined && a.melhor.kmVazio > 150 ? "texto-aviso" : ""}>
                      {a.melhor?.kmVazio !== null && a.melhor?.kmVazio !== undefined ? `${a.melhor.kmVazio} km` : "—"}
                    </strong>
                  </span>
                  <span className="oferta-camiao">
                    <span className="muted small">Camião</span>
                    <strong>{a.melhor ? `${a.melhor.veiculo.matricula}${a.melhor.veiculo.motorista ? ` · ${a.melhor.veiculo.motorista.split(" ")[0]}` : ""}` : "nenhum livre"}</strong>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
