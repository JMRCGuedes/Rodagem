import Link from "next/link";
import type { ReactNode } from "react";
import { ESTADOS_SERVICO, type EstadoServico } from "@/modules/servicos/estados";
import { diasAte, dataPt } from "@/lib/formato";

export function Topo({
  titulo,
  subtitulo,
  migalhas,
  acoes,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  migalhas?: { href: string; label: string }[];
  acoes?: ReactNode;
}) {
  return (
    <header className="topo">
      <div>
        {migalhas && (
          <div className="migalhas">
            {migalhas.map((m, i) => (
              <span key={m.href}>
                {i > 0 && " / "}
                <Link href={m.href}>{m.label}</Link>
              </span>
            ))}
          </div>
        )}
        <h1>{titulo}</h1>
        {subtitulo && <p className="muted">{subtitulo}</p>}
      </div>
      {acoes && <div className="acoes">{acoes}</div>}
    </header>
  );
}

export function EstadoTag({ estado }: { estado: EstadoServico }) {
  return <span className={`tag estado-${estado}`}>{ESTADOS_SERVICO[estado]}</span>;
}

/** Etiqueta colorida para uma data de validade. */
export function ValidadeTag({ data }: { data: string | null }) {
  if (!data) return <span className="tag tag-neutro">Sem validade</span>;
  const dias = diasAte(data);
  const classe = dias < 0 ? "tag-erro" : dias <= 30 ? "tag-aviso" : "tag-ok";
  const texto = dias < 0 ? `Expirado ${dataPt(data)}` : dias === 0 ? "Expira hoje" : dias <= 30 ? `${dias} dias · ${dataPt(data)}` : dataPt(data);
  return <span className={`tag ${classe}`}>{texto}</span>;
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="vazio">{children}</p>;
}
