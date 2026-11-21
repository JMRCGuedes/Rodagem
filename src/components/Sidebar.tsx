"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export type ItemNav = { href: string; label: string; contador?: number };
export type SecaoNav = { titulo?: string; itens: ItemNav[] };

export function Sidebar({ secoes, marca, rodape }: { secoes: SecaoNav[]; marca: ReactNode; rodape: ReactNode }) {
  const pathname = usePathname();
  const [aberta, setAberta] = useState(false);

  useEffect(() => setAberta(false), [pathname]);

  const ativo = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <div className="mobile-bar">
        {marca}
        <button type="button" onClick={() => setAberta((a) => !a)} aria-expanded={aberta}>
          {aberta ? "Fechar" : "Menu"}
        </button>
      </div>
      <nav className={`sidebar${aberta ? " aberta" : ""}`} aria-label="Navegação principal">
        {marca}
        {secoes.map((s, i) => (
          <div key={i}>
            {s.titulo && <div className="nav-sec">{s.titulo}</div>}
            {s.itens.map((it) => (
              <Link key={it.href} href={it.href} className={`nav-link${ativo(it.href) ? " ativo" : ""}`}>
                <span>{it.label}</span>
                {it.contador ? <span className="nav-count">{it.contador}</span> : null}
              </Link>
            ))}
          </div>
        ))}
        <div className="sidebar-fim">{rodape}</div>
      </nav>
    </>
  );
}
