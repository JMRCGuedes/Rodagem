import type { Metadata } from "next";
import { requireEscritorio } from "@/lib/auth";
import { listarDocumentos, TIPOS_DOC_EMPRESA } from "@/modules/documentos/queries";
import { Documentos } from "@/components/Documentos";
import { Topo } from "@/components/ui";

export const metadata: Metadata = { title: "Documentos da empresa" };

export default async function Empresa() {
  const u = await requireEscritorio();
  const docs = await listarDocumentos(u.empresaId, {});
  return (
    <>
      <Topo titulo="Documentos da empresa" subtitulo={`${u.empresaNome} · alvará, seguros e outros documentos com validade.`} />
      <Documentos documentos={docs} tipos={TIPOS_DOC_EMPRESA} podeEditar titulo="Documentos" />
    </>
  );
}
