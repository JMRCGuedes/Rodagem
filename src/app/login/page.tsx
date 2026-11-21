import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUtilizador } from "@/lib/auth";
import { paginaInicial } from "@/lib/perfis";
import { entrar } from "@/modules/contas/actions";
import { ActionForm } from "@/components/ActionForm";
import { Marca } from "@/components/Marca";

export const metadata: Metadata = { title: "Entrar" };

export default async function Login() {
  const u = await getUtilizador();
  if (u) redirect(paginaInicial(u));
  return (
    <div className="publico">
      <div className="publico-caixa">
        <Marca href="/login" />
        <div className="cartao">
          <h1>Entrar</h1>
          <p className="muted small" style={{ marginBottom: 18 }}>
            Gestão de frota, motoristas e serviços.
          </p>
          <ActionForm action={entrar} submitLabel="Entrar">
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Palavra-passe
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
          </ActionForm>
          <p className="small muted" style={{ marginTop: 18 }}>
            Ainda não tem conta? <Link href="/registar">Registar a empresa</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
