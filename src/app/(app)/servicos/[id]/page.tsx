import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEscritorio } from "@/lib/auth";
import { query } from "@/lib/db";
import { dataHoraPt, euros, numeroPt } from "@/lib/formato";
import { eventosServico, obterServico } from "@/modules/servicos/queries";
import { ACAO_TRANSICAO, referencia, TRANSICOES } from "@/modules/servicos/estados";
import { adicionarNota, apagarServico, atribuirServico, atualizarServico, mudarEstado } from "@/modules/servicos/actions";
import { TIPOS_VEICULO, type TipoVeiculo } from "@/modules/frota/queries";
import { ActionForm } from "@/components/ActionForm";
import { EstadoTag, Topo } from "@/components/ui";
import { CamposServico } from "../campos";

const ROTULO_EVENTO: Record<string, string> = {
  estado: "Estado",
  carga: "Carga",
  entrega: "Entrega",
  incidente: "Incidente",
  nota: "Nota",
};

export default async function ServicoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireEscritorio();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const s = await obterServico(u.empresaId, id);
  if (!s) notFound();

  const [eventos, veiculos, motoristas, clientes] = await Promise.all([
    eventosServico(u.empresaId, id),
    query<{ id: string; matricula: string; tipo: TipoVeiculo; estado: string }>(
      "SELECT id, matricula, tipo, estado FROM veiculos WHERE empresa_id=$1 AND estado <> 'inativo' ORDER BY matricula",
      [u.empresaId]
    ),
    query<{ id: string; nome: string }>("SELECT id, nome FROM motoristas WHERE empresa_id=$1 AND ativo ORDER BY nome", [u.empresaId]),
    query<{ id: string; nome: string }>("SELECT id, nome FROM clientes WHERE empresa_id=$1 ORDER BY nome", [u.empresaId]),
  ]);
  const motores = veiculos.filter((v) => v.tipo !== "reboque");
  const reboques = veiculos.filter((v) => v.tipo === "reboque");
  const fechado = s.estado === "faturado" || s.estado === "cancelado";

  return (
    <>
      <Topo
        titulo={
          <>
            <span className="mono">{referencia(s.numero)}</span> <EstadoTag estado={s.estado} />
          </>
        }
        subtitulo={s.cliente ?? "Sem cliente"}
        migalhas={[{ href: "/servicos", label: "Serviços" }]}
        acoes={TRANSICOES[s.estado].map((novo) => (
          <ActionForm
            key={novo}
            action={mudarEstado.bind(null, id, novo)}
            submitLabel={ACAO_TRANSICAO[novo] ?? novo}
            variante={novo === "cancelado" || novo === "pedido" ? "secundario" : "primario"}
            confirmar={novo === "cancelado" ? "Cancelar este serviço?" : undefined}
            className="form-inline"
          >
            {null}
          </ActionForm>
        ))}
      />

      <div className="grelha-2">
        <section className="cartao">
          <div className="rota" style={{ marginBottom: 12 }}>
            <span>{s.origem}</span>
            <span className="seta">→</span>
            <span>{s.destino}</span>
          </div>
          <dl className="dl">
            <dt>Carga</dt>
            <dd>{dataHoraPt(s.data_carga)}</dd>
            <dt>Entrega</dt>
            <dd>{dataHoraPt(s.data_entrega)}</dd>
            <dt>Mercadoria</dt>
            <dd>
              {s.descricao_carga ?? "—"}
              {s.peso_kg && ` · ${numeroPt(s.peso_kg, " kg")}`}
            </dd>
            <dt>Preço</dt>
            <dd>{euros(s.preco)}</dd>
            {s.notas && (
              <>
                <dt>Notas</dt>
                <dd>{s.notas}</dd>
              </>
            )}
          </dl>
        </section>

        <section className="cartao">
          <h2 style={{ marginBottom: 12 }}>Camião e motorista</h2>
          <dl className="dl" style={{ marginBottom: 14 }}>
            <dt>Veículo</dt>
            <dd>{s.trator_id ? <Link href={`/frota/${s.trator_id}`} className="mono">{s.trator}</Link> : <span className="muted">por atribuir</span>}</dd>
            <dt>Reboque</dt>
            <dd>{s.reboque_id ? <Link href={`/frota/${s.reboque_id}`} className="mono">{s.reboque}</Link> : "—"}</dd>
            <dt>Motorista</dt>
            <dd>{s.motorista_id ? <Link href={`/motoristas/${s.motorista_id}`}>{s.motorista}</Link> : <span className="muted">por atribuir</span>}</dd>
          </dl>
          {!fechado && (
            <details open={!s.trator_id || !s.motorista_id}>
              <summary>{s.trator_id || s.motorista_id ? "Alterar atribuição" : "Atribuir"}</summary>
              <ActionForm action={atribuirServico.bind(null, id)} submitLabel="Guardar atribuição">
                <div className="campos">
                  <label>
                    Trator / rígido
                    <select name="trator_id" defaultValue={s.trator_id ?? ""}>
                      <option value="">—</option>
                      {motores.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.matricula} · {TIPOS_VEICULO[v.tipo]}
                          {v.estado === "oficina" ? " (na oficina)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Reboque
                    <select name="reboque_id" defaultValue={s.reboque_id ?? ""}>
                      <option value="">—</option>
                      {reboques.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.matricula}
                          {v.estado === "oficina" ? " (na oficina)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="campo-largo">
                    Motorista
                    <select name="motorista_id" defaultValue={s.motorista_id ?? ""}>
                      <option value="">—</option>
                      {motoristas.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="check campo-largo">
                    <input type="checkbox" name="confirmar_avisos" value="sim" /> Atribuir mesmo assim, se houver avisos
                  </label>
                </div>
              </ActionForm>
            </details>
          )}
        </section>
      </div>

      <div className="grelha-2" style={{ marginTop: 16 }}>
        <section className="cartao">
          <h2 style={{ marginBottom: 14 }}>Histórico</h2>
          {eventos.length === 0 ? (
            <p className="muted small">Sem eventos.</p>
          ) : (
            <ol className="linha-tempo">
              {eventos.map((e) => (
                <li key={e.id} className={`ev-${e.tipo}`}>
                  <div className="small muted">
                    {dataHoraPt(e.ocorrido_em)} · {ROTULO_EVENTO[e.tipo] ?? e.tipo}
                    {e.utilizador && ` · ${e.utilizador}`}
                  </div>
                  <div>
                    {e.descricao}
                    {e.local && <span className="muted"> · {e.local}</span>}
                  </div>
                </li>
              ))}
            </ol>
          )}
          <details style={{ marginTop: 10 }}>
            <summary>+ Adicionar nota</summary>
            <ActionForm action={adicionarNota.bind(null, id)} submitLabel="Adicionar nota">
              <label>
                Nota
                <textarea name="descricao" required />
              </label>
            </ActionForm>
          </details>
        </section>

        <section className="cartao">
          <details>
            <summary>Editar dados do serviço</summary>
            <ActionForm action={atualizarServico.bind(null, id)} submitLabel="Guardar alterações">
              <CamposServico s={s} clientes={clientes} />
            </ActionForm>
          </details>
          {(s.estado === "pedido" || s.estado === "cancelado") && (
            <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <ActionForm
                action={apagarServico.bind(null, id)}
                submitLabel="Apagar serviço"
                variante="perigo"
                confirmar={`Apagar ${referencia(s.numero)}?`}
              >
                {null}
              </ActionForm>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
