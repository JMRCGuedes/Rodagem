import Link from "next/link";
import type { Metadata } from "next";
import { requireEscritorio } from "@/lib/auth";
import { query } from "@/lib/db";
import { criarServico } from "@/modules/servicos/actions";
import { ActionForm } from "@/components/ActionForm";
import { Topo } from "@/components/ui";
import { CamposServico } from "../campos";

export const metadata: Metadata = { title: "Novo serviço" };

/** UC04 — criar serviço a partir de um pedido do cliente. */
export default async function NovoServico({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const u = await requireEscritorio();
  const { cliente } = await searchParams;
  const clientes = await query<{ id: string; nome: string }>("SELECT id, nome FROM clientes WHERE empresa_id=$1 ORDER BY nome", [u.empresaId]);
  return (
    <>
      <Topo
        titulo="Novo serviço"
        subtitulo="Regista o pedido; a atribuição de camião e motorista faz-se a seguir."
        migalhas={[{ href: "/servicos", label: "Serviços" }]}
      />
      <section className="cartao">
        {clientes.length === 0 && (
          <p className="alerta alerta-info" style={{ marginBottom: 14 }}>
            Ainda não há clientes. Podes criar o serviço sem cliente ou <Link href="/clientes">adicionar um cliente</Link> primeiro.
          </p>
        )}
        <ActionForm action={criarServico} submitLabel="Criar serviço">
          <CamposServico clientes={clientes} clientePredefinido={cliente} />
        </ActionForm>
      </section>
    </>
  );
}
