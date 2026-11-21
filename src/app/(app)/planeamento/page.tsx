import Link from "next/link";
import type { Metadata } from "next";
import { requireEscritorio } from "@/lib/auth";
import { eGerente } from "@/lib/perfis";
import { diaCurto, numeroSemana, somarDiasISO } from "@/lib/datas";
import { hojeISO } from "@/modules/planeamento/util";
import { diaDaSemana, montarQuadro } from "@/modules/planeamento/quadro";
import { Topo } from "@/components/ui";
import { Quadro } from "./Quadro";

export const metadata: Metadata = { title: "Planeamento" };

export default async function Planeamento({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const u = await requireEscritorio();
  const { semana } = await searchParams;
  const hoje = hojeISO();
  const segunda = diaDaSemana(semana, hoje);
  const dados = await montarQuadro(u.empresaId, segunda, hoje);
  const domingo = somarDiasISO(segunda, 6);

  return (
    <>
      <Topo
        sobretitulo={`Semana ${numeroSemana(segunda)} · ${diaCurto(segunda)} a ${diaCurto(domingo)}`}
        titulo="Planeamento"
        acoes={
          <>
            <nav className="semana-nav" aria-label="Mudar de semana">
              <Link href={`/planeamento?semana=${somarDiasISO(segunda, -7)}`} aria-label="Semana anterior">
                ‹
              </Link>
              <Link href="/planeamento">Hoje</Link>
              <Link href={`/planeamento?semana=${somarDiasISO(segunda, 7)}`} aria-label="Semana seguinte">
                ›
              </Link>
            </nav>
            <Link href="/servicos/novo" className="btn btn-primario">
              + Novo serviço
            </Link>
          </>
        }
      />
      {dados.semBase && (
        <p className="alerta alerta-info" style={{ marginBottom: 14 }}>
          Indica a localidade da sede{" "}
          {eGerente(u) ? <Link href="/empresa">nos dados da empresa</Link> : "nos dados da empresa (gerente)"} para o Rodagem saber de onde
          partem os camiões e detetar cargas de retorno.
        </p>
      )}
      <Quadro dados={dados} />
    </>
  );
}
