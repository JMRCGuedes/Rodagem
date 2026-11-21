import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFrota } from "@/lib/auth";
import { eEscritorio } from "@/lib/perfis";
import { query } from "@/lib/db";
import { CARROCARIAS, type Carrocaria } from "@/lib/carrocaria";
import { dataHoraPt, dataPt, numeroPt, somarDias } from "@/lib/formato";
import { ESTADOS_VEICULO, obterVeiculo, TIPOS_COM_TACOGRAFO, TIPOS_VEICULO } from "@/modules/frota/queries";
import { listarDocumentos, TIPOS_DOC_VEICULO } from "@/modules/documentos/queries";
import { apagarVeiculo, atualizarVeiculo } from "@/modules/frota/actions";
import { PRAZO_VEICULO_DIAS } from "@/modules/tacografo/queries";
import { referencia, type EstadoServico } from "@/modules/servicos/estados";
import { ActionForm } from "@/components/ActionForm";
import { Documentos } from "@/components/Documentos";
import { EstadoTag, Topo, ValidadeTag } from "@/components/ui";
import { CamposVeiculo } from "../campos";

export default async function Veiculo({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireFrota();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const v = await obterVeiculo(u.empresaId, id);
  if (!v) notFound();
  const editar = eEscritorio(u);

  const [docs, servicos, descarga, motoristas] = await Promise.all([
    listarDocumentos(u.empresaId, { veiculoId: id }),
    query<{ id: string; numero: number; estado: EstadoServico; origem: string; destino: string; data_carga: string | null }>(
      `SELECT id, numero, estado, origem, destino, data_carga FROM servicos
        WHERE empresa_id=$1 AND (trator_id=$2 OR reboque_id=$2)
        ORDER BY data_carga DESC NULLS FIRST LIMIT 10`,
      [u.empresaId, id]
    ),
    query<{ data: string }>(
      "SELECT max(data)::text AS data FROM descargas_tacografo WHERE empresa_id=$1 AND veiculo_id=$2 AND origem='veiculo'",
      [u.empresaId, id]
    ),
    query<{ id: string; nome: string }>("SELECT id, nome FROM motoristas WHERE empresa_id=$1 AND ativo ORDER BY nome", [u.empresaId]),
  ]);
  const ultimaDescarga = descarga[0]?.data ?? null;
  const temTacografo = TIPOS_COM_TACOGRAFO.includes(v.tipo);

  return (
    <>
      <Topo
        titulo={<span className="mono">{v.matricula}</span>}
        subtitulo={`${TIPOS_VEICULO[v.tipo]}${v.marca ? ` · ${[v.marca, v.modelo].filter(Boolean).join(" ")}` : ""}`}
        migalhas={[{ href: "/frota", label: "Frota" }]}
      />

      <div className="grelha-2">
        <section className="cartao">
          <h2 style={{ marginBottom: 12 }}>Resumo</h2>
          <dl className="dl">
            <dt>Estado</dt>
            <dd>{ESTADOS_VEICULO[v.estado]}</dd>
            {v.carrocaria && (
              <>
                <dt>Carroçaria</dt>
                <dd>{CARROCARIAS[v.carrocaria as Carrocaria] ?? v.carrocaria}</dd>
              </>
            )}
            {v.motorista_habitual_id && (
              <>
                <dt>Motorista habitual</dt>
                <dd>
                  <Link href={`/motoristas/${v.motorista_habitual_id}`}>{motoristas.find((m) => m.id === v.motorista_habitual_id)?.nome ?? "—"}</Link>
                </dd>
              </>
            )}
            <dt>Ano</dt>
            <dd>{v.ano ?? "—"}</dd>
            <dt>Quilómetros</dt>
            <dd>{numeroPt(v.km, " km")}</dd>
            {temTacografo && (
              <>
                <dt>Descarga tacógrafo</dt>
                <dd>
                  {ultimaDescarga ? (
                    <>
                      Última em {dataPt(ultimaDescarga)} · próxima até{" "}
                      <ValidadeTag data={somarDias(ultimaDescarga, PRAZO_VEICULO_DIAS)} />
                    </>
                  ) : (
                    <span className="tag tag-erro">Sem registo</span>
                  )}{" "}
                  {editar && (
                    <Link href="/tacografo" className="small">
                      Registar
                    </Link>
                  )}
                </dd>
              </>
            )}
            {v.notas && (
              <>
                <dt>Notas</dt>
                <dd>{v.notas}</dd>
              </>
            )}
          </dl>
        </section>

        <section className="cartao">
          <h2 style={{ marginBottom: 12 }}>Últimos serviços</h2>
          {servicos.length === 0 ? (
            <p className="muted small">Ainda sem serviços.</p>
          ) : (
            <table>
              <tbody>
                {servicos.map((s) => (
                  <tr key={s.id}>
                    <td className="mono">
                      <Link href={`/servicos/${s.id}`}>{referencia(s.numero)}</Link>
                    </td>
                    <td>
                      {s.origem} → {s.destino}
                      <div className="muted small">{dataHoraPt(s.data_carga)}</div>
                    </td>
                    <td>
                      <EstadoTag estado={s.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div style={{ marginTop: 16 }}>
        <Documentos documentos={docs} tipos={TIPOS_DOC_VEICULO} veiculoId={id} podeEditar={editar} />
      </div>

      {editar && (
        <section className="cartao" style={{ marginTop: 16 }}>
          <details>
            <summary>Editar dados do veículo</summary>
            <ActionForm action={atualizarVeiculo.bind(null, id)} submitLabel="Guardar alterações">
              <CamposVeiculo v={v} motoristas={motoristas} />
            </ActionForm>
            <div style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <p className="muted small" style={{ marginBottom: 8 }}>
                Se o veículo foi vendido, prefere marcá-lo como Inativo para manter o histórico.
              </p>
              <ActionForm
                action={apagarVeiculo.bind(null, id)}
                submitLabel="Apagar veículo"
                variante="perigo"
                confirmar={`Apagar ${v.matricula} e todos os seus documentos?`}
              >
                {null}
              </ActionForm>
            </div>
          </details>
        </section>
      )}
    </>
  );
}
