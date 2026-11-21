import type { Metadata } from "next";
import { requireEscritorio } from "@/lib/auth";
import { query } from "@/lib/db";
import { criarVeiculo } from "@/modules/frota/actions";
import { ActionForm } from "@/components/ActionForm";
import { Topo } from "@/components/ui";
import { CamposVeiculo } from "../campos";

export const metadata: Metadata = { title: "Novo veículo" };

export default async function NovoVeiculo() {
  const u = await requireEscritorio();
  const motoristas = await query<{ id: string; nome: string }>("SELECT id, nome FROM motoristas WHERE empresa_id=$1 AND ativo ORDER BY nome", [u.empresaId]);
  return (
    <>
      <Topo titulo="Novo veículo" migalhas={[{ href: "/frota", label: "Frota" }]} />
      <section className="cartao">
        <ActionForm action={criarVeiculo} submitLabel="Guardar veículo">
          <CamposVeiculo motoristas={motoristas} />
        </ActionForm>
      </section>
    </>
  );
}
