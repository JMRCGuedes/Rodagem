import Link from "next/link";
import type { Metadata } from "next";
import { requireEscritorio } from "@/lib/auth";
import { listarClientes } from "@/modules/clientes/queries";
import { criarCliente } from "@/modules/clientes/actions";
import { ActionForm } from "@/components/ActionForm";
import { Topo, Vazio } from "@/components/ui";
import { CamposCliente } from "./campos";

export const metadata: Metadata = { title: "Clientes" };

export default async function Clientes() {
  const u = await requireEscritorio();
  const clientes = await listarClientes(u.empresaId);
  return (
    <>
      <Topo titulo="Clientes" subtitulo={`${clientes.length} ${clientes.length === 1 ? "cliente" : "clientes"}`} />
      <section className="cartao">
        {clientes.length === 0 ? (
          <Vazio>Ainda não há clientes.</Vazio>
        ) : (
          <div className="tabela-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>NIF</th>
                  <th>Contacto</th>
                  <th className="num">Serviços</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/clientes/${c.id}`}>
                        <strong>{c.nome}</strong>
                      </Link>
                    </td>
                    <td className="mono">{c.nif ?? "—"}</td>
                    <td>
                      {c.contacto ?? "—"}
                      {c.telefone && <div className="muted small">{c.telefone}</div>}
                    </td>
                    <td className="num">
                      <Link href={`/servicos?cliente=${c.id}`}>{c.servicos}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <details style={{ marginTop: 16 }} open={clientes.length === 0}>
          <summary>+ Adicionar cliente</summary>
          <ActionForm action={criarCliente} submitLabel="Guardar cliente">
            <CamposCliente />
          </ActionForm>
        </details>
      </section>
    </>
  );
}
