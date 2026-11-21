import Link from "next/link";
import type { Alerta } from "@/modules/alertas/queries";
import { dataPt } from "@/lib/formato";

function quando(a: Alerta) {
  if (a.dias < 0) return `há ${Math.abs(a.dias)} ${Math.abs(a.dias) === 1 ? "dia" : "dias"}`;
  if (a.dias === 0) return "hoje";
  if (a.dias === 1) return "amanhã";
  return `em ${a.dias} dias`;
}

export function ListaAlertas({ alertas, vazio = "Sem prazos a vencer. Tudo em dia." }: { alertas: Alerta[]; vazio?: string }) {
  if (!alertas.length) return <p className="vazio">{vazio}</p>;
  return (
    <ul className="lista-alertas">
      {alertas.map((a) => (
        <li key={a.chave}>
          <span className={`ponto ponto-${a.gravidade}`} aria-hidden />
          <div>
            <Link href={a.link}>
              <strong>{a.sujeito}</strong>
            </Link>{" "}
            · {a.titulo}
          </div>
          <div className="quando">
            <div className={a.gravidade === "expirado" ? "tag tag-erro" : a.gravidade === "urgente" ? "tag tag-aviso" : "tag tag-neutro"}>
              {a.dias < 0 ? "Expirado" : "Vence"} {quando(a)}
            </div>
            <div className="muted small mono">{dataPt(a.dataLimite)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
