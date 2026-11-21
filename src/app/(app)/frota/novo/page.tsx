import type { Metadata } from "next";
import { requireEscritorio } from "@/lib/auth";
import { criarVeiculo } from "@/modules/frota/actions";
import { ActionForm } from "@/components/ActionForm";
import { Topo } from "@/components/ui";
import { CamposVeiculo } from "../campos";

export const metadata: Metadata = { title: "Novo veículo" };

export default async function NovoVeiculo() {
  await requireEscritorio();
  return (
    <>
      <Topo titulo="Novo veículo" migalhas={[{ href: "/frota", label: "Frota" }]} />
      <section className="cartao">
        <ActionForm action={criarVeiculo} submitLabel="Guardar veículo">
          <CamposVeiculo />
        </ActionForm>
      </section>
    </>
  );
}
