"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icone, type NomeIcone } from "./Icone";

export type ItemNav = { href: string; label: string; contador?: number };
export type SecaoNav = { titulo?: string; itens: ItemNav[] };
export type ItemInferior = { href: string; label: string; icone: NomeIcone; contador?: number };

type Props = {
  secoes: SecaoNav[];
  inferior: ItemInferior[];
  marca: ReactNode;
  rodape: ReactNode;
  children: ReactNode;
};

/**
 * Navegação da aplicação. No computador: barra lateral fixa.
 * No telemóvel (PWA): barra de topo, navegação inferior e gaveta com o menu completo.
 */
export function Navegacao({ secoes, inferior, marca, rodape, children }: Props) {
  const pathname = usePathname();
  const [aberta, setAberta] = useState(false);

  useEffect(() => setAberta(false), [pathname]);
  useEffect(() => {
    if (!aberta) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [aberta]);

  const ativo = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const comBottomNav = inferior.length > 1;

  return (
    <div className="app">
      <div className="mobile-bar">
        {marca}
        <button type="button" className="icone-btn" onClick={() => setAberta(true)} aria-label="Abrir menu" aria-expanded={aberta}>
          <Icone nome="menu" />
        </button>
      </div>

      <button
        type="button"
        className={`gaveta-fundo${aberta ? " visivel" : ""}`}
        aria-label="Fechar menu"
        tabIndex={aberta ? 0 : -1}
        onClick={() => setAberta(false)}
      />
      <nav className={`sidebar${aberta ? " aberta" : ""}`} aria-label="Navegação principal">
        {marca}
        {secoes.map((s, i) => (
          <div key={i}>
            {s.titulo && <div className="nav-sec">{s.titulo}</div>}
            {s.itens.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`nav-link${ativo(it.href) ? " ativo" : ""}`}
                aria-current={ativo(it.href) ? "page" : undefined}
              >
                <span>{it.label}</span>
                {it.contador ? <span className="nav-count">{it.contador}</span> : null}
              </Link>
            ))}
          </div>
        ))}
        <div className="sidebar-fim">{rodape}</div>
      </nav>

      <main className={`conteudo${comBottomNav ? "" : " sem-bottom-nav"}`}>
        <div className="conteudo-interior">{children}</div>
      </main>

      {comBottomNav && (
        <nav className="bottom-nav" aria-label="Navegação rápida">
          {inferior.map((it) => (
            <Link key={it.href} href={it.href} className={ativo(it.href) ? "ativo" : ""} aria-current={ativo(it.href) ? "page" : undefined}>
              <Icone nome={it.icone} />
              {it.contador ? <span className="ponto-badge">{it.contador}</span> : null}
              {it.label}
            </Link>
          ))}
          <button type="button" onClick={() => setAberta(true)} aria-label="Mais opções">
            <Icone nome="mais" />
            Mais
          </button>
        </nav>
      )}
    </div>
  );
}
