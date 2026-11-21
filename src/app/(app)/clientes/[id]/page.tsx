import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEscritorio } from "@/lib/auth";
import { obterCliente } from "@/modules/clientes/queries";
import { apagarCliente, atualizarCliente } from "@/modules/clientes/actions";
import { ActionForm } from "@/components/ActionForm";
import { Topo } from "@/components/ui";
import { CamposCliente } from "../campos";

export default async function ClienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireEscritorio();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const c = await obterCliente(u.empresaId, id);
  if (!c) notFound();
  return (
    <>
      <Topo
        titulo={c.nome}
        migalhas={[{ href: "/clientes", label: "Clientes" }]}
        acoes={
          <>
            <Link href={`/servicos?cliente=${id}`} className="btn btn-secundario">
              Ver serviços
            </Link>
            <Link href={`/servicos/novo?cliente=${id}`} className="btn btn-primario">
              Novo serviço
            </Link>
          </>
        }
      />
      <section className="cartao">
        <ActionForm action={atualizarCliente.bind(null, id)} submitLabel="Guardar alterações">
          <CamposCliente c={c} />
        </ActionForm>
      </section>
      <section className="cartao">
        <p className="muted small" style={{ marginBottom: 8 }}>
          Apagar o cliente mantém os serviços, mas deixam de ter cliente associado.
        </p>
        <ActionForm action={apagarCliente.bind(null, id)} submitLabel="Apagar cliente" variante="perigo" confirmar={`Apagar ${c.nome}?`}>
          {null}
        </ActionForm>
      </section>
    </>
  );
}
