import type { Metadata } from "next";
import { requireEscritorio } from "@/lib/auth";
import { criarMotorista } from "@/modules/motoristas/actions";
import { ActionForm } from "@/components/ActionForm";
import { Topo } from "@/components/ui";
import { CamposMotorista } from "../campos";

export const metadata: Metadata = { title: "Novo motorista" };

export default async function NovoMotorista() {
  await requireEscritorio();
  return (
    <>
      <Topo
        titulo="Novo motorista"
        subtitulo="Depois de guardar, adiciona a carta, o CAM e o cartão de condutor com as validades."
        migalhas={[{ href: "/motoristas", label: "Motoristas" }]}
      />
      <section className="cartao">
        <ActionForm action={criarMotorista} submitLabel="Guardar motorista">
          <CamposMotorista />
        </ActionForm>
      </section>
    </>
  );
}
