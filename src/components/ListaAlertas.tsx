import Link from "next/link";
import type { Alerta } from "@/modules/alertas/queries";
import { dataPt } from "@/lib/formato";

function quando(a: Alerta) {
  if (a.dias < 0) return `Expirou há ${Math.abs(a.dias)} ${Math.abs(a.dias) === 1 ? "dia" : "dias"}`;
  if (a.dias === 0) return "Hoje";
  if (a.dias === 1) return "Amanhã";
  return `Em ${a.dias} dias`;
}

/** Duas letras que identificam o tipo de prazo no ícone. */
function sigla(a: Alerta) {
  if (a.categoria === "tacografo") return "TC";
  const palavras = a.titulo.replace(/[()/]/g, " ").split(/\s+/).filter(Boolean);
  if (palavras.length === 1) return palavras[0]!.slice(0, 2).toUpperCase();
  return (palavras[0]![0]! + palavras[1]![0]!).toUpperCase();
}

export function ListaAlertas({ alertas, vazio = "Sem prazos a vencer. Tudo em dia." }: { alertas: Alerta[]; vazio?: string }) {
  if (!alertas.length) return <p className="vazio">{vazio}</p>;
  return (
    <ul className="lista-alertas">
      {alertas.map((a) => (
        <li key={a.chave}>
          <span className={`alerta-icone tom-${a.gravidade}`} aria-hidden="true">
            {sigla(a)}
          </span>
          <div className="alerta-texto">
            <Link href={a.link}>{a.sujeito}</Link>
            <div>{a.titulo}</div>
          </div>
          <div className="alerta-quando">
            <span className={`tag tom-${a.gravidade}`}>{quando(a)}</span>
            <div className="data">{dataPt(a.dataLimite)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
