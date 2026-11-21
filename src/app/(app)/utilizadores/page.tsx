import type { Metadata } from "next";
import { requireGerente } from "@/lib/auth";
import { query } from "@/lib/db";
import { PERFIL_LABEL, PERFIS } from "@/lib/perfis";
import { listarUtilizadores } from "@/modules/contas/queries";
import { alternarAtivo, criarUtilizador, redefinirPassword } from "@/modules/contas/actions";
import { ActionForm } from "@/components/ActionForm";
import { Topo } from "@/components/ui";

export const metadata: Metadata = { title: "Utilizadores" };

/** UC16 — o gerente gere quem tem acesso e com que perfis. */
export default async function Utilizadores() {
  const g = await requireGerente();
  const [utilizadores, motoristasSemConta] = await Promise.all([
    listarUtilizadores(g.empresaId),
    query<{ id: string; nome: string }>(
      `SELECT m.id, m.nome FROM motoristas m
        WHERE m.empresa_id=$1 AND m.ativo AND NOT EXISTS (SELECT 1 FROM utilizadores u WHERE u.motorista_id = m.id)
        ORDER BY m.nome`,
      [g.empresaId]
    ),
  ]);

  return (
    <>
      <Topo titulo="Utilizadores" subtitulo="Contas com acesso ao Rodagem nesta empresa." />
      <section className="cartao">
        <div className="tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Perfis</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {utilizadores.map((x) => (
                <tr key={x.id}>
                  <td>
                    <strong>{x.nome}</strong>
                    {x.motorista && <div className="muted small">Motorista: {x.motorista}</div>}
                  </td>
                  <td>{x.email}</td>
                  <td>
                    <div className="acoes">
                      {x.perfis.map((p) => (
                        <span key={p} className="tag tag-neutro">
                          {PERFIL_LABEL[p]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{x.ativo ? <span className="tag tag-ok">Ativa</span> : <span className="tag tag-neutro">Desativada</span>}</td>
                  <td style={{ minWidth: 150 }}>
                    <details>
                      <summary className="small">Gerir</summary>
                      <div className="pilha">
                        <ActionForm action={redefinirPassword.bind(null, x.id)} submitLabel="Mudar palavra-passe" variante="secundario">
                          <label>
                            Nova palavra-passe
                            <input name="password" type="password" minLength={8} autoComplete="new-password" required />
                          </label>
                        </ActionForm>
                        {x.id !== g.id && (
                          <ActionForm
                            action={alternarAtivo.bind(null, x.id)}
                            submitLabel={x.ativo ? "Desativar conta" : "Reativar conta"}
                            variante={x.ativo ? "perigo" : "secundario"}
                          >
                            {null}
                          </ActionForm>
                        )}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cartao">
        <h2 style={{ marginBottom: 12 }}>Nova conta</h2>
        <ActionForm action={criarUtilizador} submitLabel="Criar conta">
          <div className="campos">
            <label>
              Nome
              <input name="nome" required />
            </label>
            <label>
              Email
              <input name="email" type="email" required autoComplete="off" />
            </label>
            <label>
              Palavra-passe inicial <span className="ajuda">mínimo 8 caracteres</span>
              <input name="password" type="password" minLength={8} required autoComplete="new-password" />
            </label>
            <label>
              Associar a motorista <span className="ajuda">obrigatório para o perfil Motorista</span>
              <select name="motorista_id" defaultValue="">
                <option value="">—</option>
                {motoristasSemConta.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="campo-largo">
              <legend>Perfis</legend>
              <div className="checks">
                {PERFIS.map((p) => (
                  <label key={p} className="check">
                    <input type="checkbox" name="perfis" value={p} /> {PERFIL_LABEL[p]}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
