import { requireUtilizador } from "@/lib/auth";
import { eEscritorio, eGerente, PERFIL_LABEL, podeVerFrota, temPerfil } from "@/lib/perfis";
import { listarAlertas } from "@/modules/alertas/queries";
import { sair } from "@/modules/contas/actions";
import { Navegacao, type ItemInferior, type SecaoNav } from "@/components/Sidebar";
import { Marca } from "@/components/Marca";
import { Icone } from "@/components/Icone";

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1]![0] : "")).toUpperCase();
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUtilizador();
  const secoes: SecaoNav[] = [];
  const inferior: ItemInferior[] = [];

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
    inferior.push(
      { href: "/painel", label: "Painel", icone: "painel" },
      { href: "/servicos", label: "Serviços", icone: "servicos" },
      { href: "/frota", label: "Frota", icone: "frota" },
      { href: "/alertas", label: "Alertas", icone: "alertas", contador: criticos }
    );
  } else if (podeVerFrota(u)) {
    secoes.push({ itens: [{ href: "/frota", label: "Frota" }] });
  }
  if (temPerfil(u, "motorista") && u.motoristaId) {
    secoes.push({ titulo: eEscritorio(u) ? "Motorista" : undefined, itens: [{ href: "/motorista", label: "Os meus serviços" }] });
  }

  const rodape = (
    <>
      <span className="avatar" aria-hidden="true">
        {iniciais(u.nome)}
      </span>
      <div className="quem">
        <strong>{u.nome}</strong>
        <span>
          {u.empresaNome} · {u.perfis.map((p) => PERFIL_LABEL[p]).join(", ")}
        </span>
      </div>
      <form action={sair}>
        <button type="submit" className="link-sair" aria-label="Sair" title="Sair">
          <Icone nome="sair" tamanho={18} />
        </button>
      </form>
    </>
  );

  return (
    <Navegacao secoes={secoes} inferior={inferior} marca={<Marca href="/" />} rodape={rodape}>
      {children}
    </Navegacao>
  );
}
