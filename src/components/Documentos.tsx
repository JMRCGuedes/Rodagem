import { apagarDocumento, criarDocumento, renovarDocumento } from "@/modules/documentos/actions";
import type { Documento } from "@/modules/documentos/queries";
import { dataPt } from "@/lib/formato";
import { ActionForm } from "./ActionForm";
import { ValidadeTag, Vazio } from "./ui";

type Props = {
  documentos: Documento[];
  tipos: string[];
  veiculoId?: string;
  motoristaId?: string;
  podeEditar: boolean;
  titulo?: string;
};

/** Lista de documentos com validade de um veículo, motorista ou da empresa (UC02, UC03). */
export function Documentos({ documentos, tipos, veiculoId, motoristaId, podeEditar, titulo = "Documentos e validades" }: Props) {
  return (
    <section className="cartao">
      <div className="cartao-cab">
        <h2>{titulo}</h2>
      </div>
      {documentos.length === 0 ? (
        <Vazio>Sem documentos registados.</Vazio>
      ) : (
        <div className="tabela-wrap">
          <table className="responsiva">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Número</th>
                <th>Emissão</th>
                <th>Validade</th>
                {podeEditar && <th />}
              </tr>
            </thead>
            <tbody>
              {documentos.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.tipo}</strong>
                    {d.notas && <div className="muted small">{d.notas}</div>}
                  </td>
                  <td className="mono small" data-label="N.º">{d.numero ?? "—"}</td>
                  <td className="mono small col-opc">{dataPt(d.data_emissao)}</td>
                  <td>
                    <ValidadeTag data={d.data_validade} />
                  </td>
                  {podeEditar && (
                    <td style={{ minWidth: 120 }}>
                      <details>
                        <summary className="small">Renovar</summary>
                        <ActionForm action={renovarDocumento.bind(null, d.id)} submitLabel="Guardar">
                          <label>
                            Novo número
                            <input name="numero" defaultValue={d.numero ?? ""} />
                          </label>
                          <label>
                            Emissão
                            <input name="data_emissao" type="date" />
                          </label>
                          <label>
                            Nova validade
                            <input name="data_validade" type="date" required />
                          </label>
                        </ActionForm>
                        <div style={{ marginTop: 10 }}>
                          <ActionForm
                            action={apagarDocumento.bind(null, d.id)}
                            submitLabel="Apagar"
                            variante="perigo"
                            confirmar={`Apagar ${d.tipo}?`}
                          >
                            {null}
                          </ActionForm>
                        </div>
                      </details>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {podeEditar && (
        <details style={{ marginTop: 16 }}>
          <summary>+ Adicionar documento</summary>
          <ActionForm action={criarDocumento} submitLabel="Adicionar">
            {veiculoId && <input type="hidden" name="veiculo_id" value={veiculoId} />}
            {motoristaId && <input type="hidden" name="motorista_id" value={motoristaId} />}
            <div className="campos">
              <label>
                Tipo
                <select name="tipo" required defaultValue="">
                  <option value="" disabled>
                    Escolher…
                  </option>
                  {tipos.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Se &quot;Outro&quot;, qual?
                <input name="tipo_outro" />
              </label>
              <label>
                Número
                <input name="numero" />
              </label>
              <label>
                Data de emissão
                <input name="data_emissao" type="date" />
              </label>
              <label>
                Data de validade
                <input name="data_validade" type="date" />
              </label>
              <label>
                Notas
                <input name="notas" />
              </label>
            </div>
          </ActionForm>
        </details>
      )}
    </section>
  );
}
