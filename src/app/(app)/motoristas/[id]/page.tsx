import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEscritorio } from "@/lib/auth";
import { query } from "@/lib/db";
import { dataHoraPt, dataPt, somarDias } from "@/lib/formato";
import { obterMotorista } from "@/modules/motoristas/queries";
import { apagarMotorista, atualizarMotorista } from "@/modules/motoristas/actions";
import { listarDocumentos, TIPOS_DOC_MOTORISTA } from "@/modules/documentos/queries";
import { PRAZO_CARTAO_DIAS } from "@/modules/tacografo/queries";
import { referencia, type EstadoServico } from "@/modules/servicos/estados";
import { ActionForm } from "@/components/ActionForm";
import { Documentos } from "@/components/Documentos";
import { EstadoTag, Topo, ValidadeTag } from "@/components/ui";
import { CamposMotorista } from "../campos";

export default async function MotoristaDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireEscritorio();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const m = await obterMotorista(u.empresaId, id);
  if (!m) notFound();

  const [docs, servicos, descarga, conta] = await Promise.all([
    listarDocumentos(u.empresaId, { motoristaId: id }),
    query<{ id: string; numero: number; estado: EstadoServico; origem: string; destino: string; data_carga: string | null }>(
      `SELECT id, numero, estado, origem, destino, data_carga FROM servicos
        WHERE empresa_id=$1 AND motorista_id=$2 ORDER BY data_carga DESC NULLS FIRST LIMIT 10`,
      [u.empresaId, id]
    ),
    query<{ data: string | null }>(
      "SELECT max(data)::text AS data FROM descargas_tacografo WHERE empresa_id=$1 AND motorista_id=$2 AND origem='cartao'",
      [u.empresaId, id]
    ),
    query<{ email: string; ativo: boolean }>("SELECT email, ativo FROM utilizadores WHERE motorista_id=$1", [id]),
  ]);
  const ultima = descarga[0]?.data ?? null;

  return (
    <>
      <Topo
        titulo={m.nome}
        subtitulo={m.ativo ? "Motorista ativo" : "Motorista inativo"}
        migalhas={[{ href: "/motoristas", label: "Motoristas" }]}
      />

      <div className="grelha-2">
        <section className="cartao">
          <h2 style={{ marginBottom: 12 }}>Resumo</h2>
          <dl className="dl">
            <dt>Telefone</dt>
            <dd>{m.telefone ? <a href={`tel:${m.telefone}`}>{m.telefone}</a> : "—"}</dd>
            <dt>Email</dt>
            <dd>{m.email ?? "—"}</dd>
            <dt>NIF</dt>
            <dd className="mono">{m.nif ?? "—"}</dd>
            <dt>Carta</dt>
            <dd>{m.categorias_carta ?? "—"}</dd>
            <dt>Cartão tacógrafo</dt>
            <dd>
              {ultima ? (
                <>
                  Última descarga {dataPt(ultima)} · próxima até <ValidadeTag data={somarDias(ultima, PRAZO_CARTAO_DIAS)} />
                </>
              ) : (
                <span className="tag tag-erro">Sem registo</span>
              )}{" "}
              <Link href="/tacografo" className="small">
                Registar
              </Link>
            </dd>
            <dt>Conta na app</dt>
            <dd>
              {conta[0] ? (
                <>
                  {conta[0].email} {!conta[0].ativo && <span className="tag tag-neutro">Desativada</span>}
                </>
              ) : (
                <Link href="/utilizadores">Criar acesso para o motorista</Link>
              )}
            </dd>
            {m.notas && (
              <>
                <dt>Notas</dt>
                <dd>{m.notas}</dd>
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
        <Documentos documentos={docs} tipos={TIPOS_DOC_MOTORISTA} motoristaId={id} podeEditar />
      </div>

      <section className="cartao" style={{ marginTop: 16 }}>
        <details>
          <summary>Editar dados do motorista</summary>
          <ActionForm action={atualizarMotorista.bind(null, id)} submitLabel="Guardar alterações">
            <CamposMotorista m={m} />
          </ActionForm>
          <div style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <p className="muted small" style={{ marginBottom: 8 }}>
              Se o motorista saiu da empresa, prefere marcá-lo como Inativo para manter o histórico.
            </p>
            <ActionForm
              action={apagarMotorista.bind(null, id)}
              submitLabel="Apagar motorista"
              variante="perigo"
              confirmar={`Apagar ${m.nome} e todos os seus documentos?`}
            >
              {null}
            </ActionForm>
          </div>
        </details>
      </section>
    </>
  );
}
