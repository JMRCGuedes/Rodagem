export type NomeIcone = "painel" | "servicos" | "frota" | "alertas" | "motoristas" | "mais" | "menu" | "fechar" | "sair";

const PATHS: Record<NomeIcone, string> = {
  painel: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  servicos: "M4 6h16M4 12h16M4 18h10",
  frota: "M2 7h11v9H2zM13 10h4l3 3v3h-7zM6 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01",
  alertas: "M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6zM10 19a2 2 0 0 0 4 0",
  motoristas: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  mais: "M5 12h.01M12 12h.01M19 12h.01",
  menu: "M4 7h16M4 12h16M4 17h16",
  fechar: "M6 6l12 12M18 6L6 18",
  sair: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
};

export function Icone({ nome, tamanho = 22 }: { nome: NomeIcone; tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={nome === "mais" ? 3 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[nome]} />
    </svg>
  );
}
