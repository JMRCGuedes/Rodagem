import { requireUtilizador } from "@/lib/auth";
import { eEscritorio, eGerente, PERFIL_LABEL, podeVerFrota, temPerfil } from "@/lib/perfis";
import { listarAlertas } from "@/modules/alertas/queries";
import { sair } from "@/modules/contas/actions";
import { Sidebar, type SecaoNav } from "@/components/Sidebar";
import { Marca } from "@/components/Marca";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUtilizador();
  const secoes: SecaoNav[] = [];

  if (eEscritorio(u)) {
    const alertas = await listarAlertas(u.empresaId);
    const criticos = alertas.filter((a) => a.gravidade !== "proximo").length;
    secoes.push(
      {
        itens: [
          { href: "/painel", label: "Painel" },
          { href: "/alertas", label: "Alertas", contador: criticos },
        ],
      },
      {
        titulo: "Operação",
        itens: [
          { href: "/servicos", label: "Serviços" },
          { href: "/clientes", label: "Clientes" },
        ],
      },
      {
        titulo: "Recursos",
        itens: [
          { href: "/frota", label: "Frota" },
          { href: "/motoristas", label: "Motoristas" },
          { href: "/tacografo", label: "Tacógrafo" },
        ],
      },
      {
        titulo: "Empresa",
        itens: [
          { href: "/empresa", label: "Documentos da empresa" },
          ...(eGerente(u) ? [{ href: "/utilizadores", label: "Utilizadores" }] : []),
        ],
      }
    );
  } else if (podeVerFrota(u)) {
    secoes.push({ itens: [{ href: "/frota", label: "Frota" }] });
  }
  if (temPerfil(u, "motorista") && u.motoristaId) {
    secoes.push({ titulo: eEscritorio(u) ? "Motorista" : undefined, itens: [{ href: "/motorista", label: "Os meus serviços" }] });
  }

  const rodape = (
    <>
      <strong>{u.nome}</strong>
      <span>
        {u.empresaNome} · {u.perfis.map((p) => PERFIL_LABEL[p]).join(", ")}
      </span>
      <form action={sair}>
        <button type="submit" className="link-sair">
          Sair
        </button>
      </form>
    </>
  );

  return (
    <div className="app">
      <Sidebar secoes={secoes} marca={<Marca href="/" />} rodape={rodape} />
      <main className="conteudo">{children}</main>
    </div>
  );
}
