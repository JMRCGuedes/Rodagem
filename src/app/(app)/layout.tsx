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
          { href: "/planeamento", label: "Planeamento" },
          { href: "/cargas", label: "Assistente de cargas" },
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
          { href: "/empresa", label: "Empresa e documentos" },
          ...(eGerente(u) ? [{ href: "/utilizadores", label: "Utilizadores" }] : []),
        ],
      }
    );
    inferior.push(
      { href: "/painel", label: "Painel", icone: "painel", contador: criticos },
      { href: "/planeamento", label: "Planear", icone: "planeamento" },
      { href: "/cargas", label: "Cargas", icone: "cargas" },
      { href: "/servicos", label: "Serviços", icone: "servicos" }
    );
  } else if (podeVerFrota(u)) {
    secoes.push({ itens: [{ href: "/frota", label: "Frota" }] });
  }
  if (temPerfil(u, "motorista") && u.motoristaId) {
    secoes.push({ titulo: eEscritorio(u) ? "Motorista" : undefined, itens: [{ href: "/motorista", label: "Hoje" }] });
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
