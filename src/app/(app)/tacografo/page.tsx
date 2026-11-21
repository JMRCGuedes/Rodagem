import Link from "next/link";
import type { Metadata } from "next";
import { requireEscritorio } from "@/lib/auth";
import { dataPt, hojeLisboa } from "@/lib/formato";
import { estadoDescargas, historicoDescargas, PRAZO_CARTAO_DIAS, PRAZO_VEICULO_DIAS } from "@/modules/tacografo/queries";
import { registarDescarga } from "@/modules/tacografo/actions";
import { ActionForm } from "@/components/ActionForm";
import { Topo, Vazio } from "@/components/ui";

export const metadata: Metadata = { title: "Tacógrafo" };

function estadoTag(dias: number, ultima: string | null) {
  if (!ultima) return <span className="tag tag-erro">Sem registo</span>;
  if (dias < 0) return <span className="tag tag-erro">Em atraso {Math.abs(dias)} d</span>;
  if (dias <= 7) return <span className="tag tag-aviso">Faltam {dias} d</span>;
  return <span className="tag tag-ok">Faltam {dias} d</span>;
}

/** UC09 — registo das descargas do cartão do motorista e da unidade do veículo. */
export default async function Tacografo() {
  const u = await requireEscritorio();
  const [estado, historico] = await Promise.all([estadoDescargas(u.empresaId), historicoDescargas(u.empresaId)]);
  const cartoes = estado.filter((e) => e.origem === "cartao");
  const veiculos = estado.filter((e) => e.origem === "veiculo");

  return (
    <>
      <Topo
        titulo="Tacógrafo"
        subtitulo={`Cartão do motorista: descarga a cada ${PRAZO_CARTAO_DIAS} dias. Unidade do veículo: a cada ${PRAZO_VEICULO_DIAS} dias.`}
      />

      <section className="cartao">
        <h2 style={{ marginBottom: 12 }}>Registar descarga</h2>
        {estado.length === 0 ? (
          <p className="muted">
            Adiciona primeiro <Link href="/motoristas/novo">motoristas</Link> ou <Link href="/frota/novo">tratores e rígidos</Link>.
          </p>
        ) : (
          <ActionForm action={registarDescarga} submitLabel="Registar descarga">
            <div className="campos campos-3">
              <label>
                Cartão ou veículo
                <select name="alvo" required defaultValue="">
                  <option value="" disabled>
                    Escolher…
                  </option>
                  {cartoes.length > 0 && (
                    <optgroup label="Cartão do motorista">
                      {cartoes.map((c) => (
                        <option key={c.id} value={`cartao:${c.id}`}>
                          {c.nome}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {veiculos.length > 0 && (
                    <optgroup label="Unidade do veículo">
                      {veiculos.map((v) => (
                        <option key={v.id} value={`veiculo:${v.id}`}>
                          {v.nome}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
              <label>
                Data da descarga
                <input name="data" type="date" defaultValue={hojeLisboa()} max={hojeLisboa()} required />
              </label>
              <label>
                Notas
                <input name="notas" placeholder="Ex.: descarga remota" />
              </label>
            </div>
          </ActionForm>
        )}
      </section>

      <div className="grelha-2" style={{ marginTop: 16 }}>
        {[
          { titulo: "Cartões de motorista", lista: cartoes, link: "/motoristas" },
          { titulo: "Unidades dos veículos", lista: veiculos, link: "/frota" },
        ].map((bloco) => (
          <section className="cartao" key={bloco.titulo}>
            <h2 style={{ marginBottom: 12 }}>{bloco.titulo}</h2>
            {bloco.lista.length === 0 ? (
              <Vazio>Nada para mostrar.</Vazio>
            ) : (
              <table className="responsiva">
                <thead>
                  <tr>
                    <th>{bloco.link === "/frota" ? "Veículo" : "Motorista"}</th>
                    <th>Última</th>
                    <th>Limite</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {bloco.lista.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <Link href={`${bloco.link}/${e.id}`} className={bloco.link === "/frota" ? "mono" : ""}>
                          {e.nome}
                        </Link>
                      </td>
                      <td className="mono small" data-label="Última">{dataPt(e.ultima)}</td>
                      <td className="mono small" data-label="Limite">{e.ultima ? dataPt(e.proxima) : "—"}</td>
                      <td className="col-fim">{estadoTag(e.dias, e.ultima)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}
      </div>

      <section className="cartao" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 12 }}>Últimas descargas registadas</h2>
        {historico.length === 0 ? (
          <Vazio>Ainda não há descargas registadas.</Vazio>
        ) : (
          <div className="tabela-wrap">
            <table className="responsiva">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Origem</th>
                  <th>Motorista / veículo</th>
                  <th>Notas</th>
                  <th>Registado por</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((h) => (
                  <tr key={h.id}>
                    <td className="mono">{dataPt(h.data)}</td>
                    <td>{h.origem === "cartao" ? "Cartão" : "Veículo"}</td>
                    <td>{h.motorista ?? <span className="mono">{h.matricula}</span>}</td>
                    <td className="small">{h.notas ?? "—"}</td>
                    <td className="small muted col-opc">{h.registado_por ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted" style={{ marginTop: 12 }}>
          O Rodagem regista as datas e avisa dos prazos; os ficheiros .DDD continuam a ser descarregados com o equipamento ou serviço de descarga remota da empresa.
        </p>
      </section>
    </>
  );
}
