import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUtilizador } from "@/lib/auth";
import { paginaInicial } from "@/lib/perfis";
import { registarEmpresa } from "@/modules/contas/actions";
import { ActionForm } from "@/components/ActionForm";
import { Marca } from "@/components/Marca";

export const metadata: Metadata = { title: "Registar empresa" };

export default async function Registar() {
  const u = await getUtilizador();
  if (u) redirect(paginaInicial(u));
  return (
    <div className="publico">
      <div className="publico-caixa">
        <Marca href="/login" />
        <div className="cartao">
          <h1>Registar a empresa</h1>
          <p className="muted small" style={{ marginBottom: 18 }}>
            Quem regista fica como gerente e pode depois criar contas para a equipa e os motoristas.
          </p>
          <ActionForm action={registarEmpresa} submitLabel="Criar conta">
            <label>
              Nome da empresa
              <input name="empresa" required />
            </label>
            <label>
              NIF da empresa <span className="ajuda">opcional</span>
              <input name="nif" inputMode="numeric" />
            </label>
            <label>
              Localidade da sede <span className="ajuda">de onde saem os camiões, ex.: Guimarães</span>
              <input name="localidade_base" />
            </label>
            <label>
              O seu nome
              <input name="nome" autoComplete="name" required />
            </label>
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Palavra-passe <span className="ajuda">mínimo 8 caracteres</span>
              <input name="password" type="password" autoComplete="new-password" minLength={8} required />
            </label>
          </ActionForm>
          <p className="small muted" style={{ marginTop: 18 }}>
            Já tem conta? <Link href="/login">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
