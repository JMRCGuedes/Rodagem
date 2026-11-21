import type { Metadata } from "next";
import { requireEscritorio } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { eGerente } from "@/lib/perfis";
import { iaConfigurada, nomeFornecedorIA } from "@/lib/ia";
import { listarDocumentos, TIPOS_DOC_EMPRESA } from "@/modules/documentos/queries";
import { atualizarEmpresa } from "@/modules/contas/actions";
import { ActionForm } from "@/components/ActionForm";
import { Documentos } from "@/components/Documentos";
import { Topo } from "@/components/ui";

export const metadata: Metadata = { title: "Empresa" };

export default async function Empresa() {
  const u = await requireEscritorio();
  const [docs, empresa] = await Promise.all([
    listarDocumentos(u.empresaId, {}),
    queryOne<{ nome: string; nif: string | null; localidade_base: string | null }>(
      "SELECT nome, nif, localidade_base FROM empresas WHERE id=$1",
      [u.empresaId]
    ),
  ]);
  const ia = nomeFornecedorIA();

  return (
    <>
      <Topo titulo="Empresa" subtitulo="Dados da empresa, documentos com validade e configuração." />

      {eGerente(u) && empresa && (
        <section className="cartao">
          <h2 style={{ marginBottom: 12 }}>Dados da empresa</h2>
          <ActionForm action={atualizarEmpresa} submitLabel="Guardar">
            <div className="campos campos-3">
              <label>
                Nome
                <input name="nome" defaultValue={empresa.nome} required />
              </label>
              <label>
                NIF
                <input name="nif" defaultValue={empresa.nif ?? ""} inputMode="numeric" />
              </label>
              <label>
                Localidade da sede <span className="ajuda">ponto de partida dos camiões</span>
                <input name="localidade_base" defaultValue={empresa.localidade_base ?? ""} placeholder="Guimarães, Portugal" />
              </label>
            </div>
          </ActionForm>
        </section>
      )}

      <Documentos documentos={docs} tipos={TIPOS_DOC_EMPRESA} podeEditar titulo="Documentos da empresa" />

      <section className="cartao">
        <h2 style={{ marginBottom: 8 }}>Assistente de cargas · IA</h2>
        {iaConfigurada() ? (
          <p>
            <span className="tag tag-ok">Ligada</span> A análise automática de ofertas usa {ia}.
          </p>
        ) : (
          <p className="muted">
            <span className="tag tag-neutro">Desligada</span> As ofertas preenchem-se à mão. Para ligar, define no Render as variáveis{" "}
            <code>IA_FORNECEDOR</code> (anthropic, gemini ou openai) e <code>IA_CHAVE</code>.
          </p>
        )}
      </section>
    </>
  );
}
