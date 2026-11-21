import "server-only";
import { query } from "@/lib/db";
import { diaCurto, diaLisboa, diferencaDias, rotuloDia, somarDiasISO } from "@/lib/datas";
import { orcamentoGeocode } from "@/lib/geo";
import { referencia } from "@/modules/servicos/estados";
import { carregarContexto, eLonge, localNoDia, sugerirVeiculos } from "./contexto";

export type ItemQuadro = {
  chave: string;
  tipo: "servico" | "livre";
  col: number; // 0 = segunda
  span: number;
  titulo: string;
  sub: string;
  estado?: string;
  servicoId?: string;
  retorno?: { local: string; dia: string };
};

export type LinhaQuadro = {
  id: string;
  matricula: string;
  tipo: string;
  motorista: string | null;
  estado: string;
  aviso: string | null;
  itens: ItemQuadro[];
};

export type PendenteQuadro = {
  id: string;
  ref: string;
  cliente: string | null;
  rota: string;
  quando: string;
  carga: string | null;
  sugestao: { veiculoId: string; matricula: string; motorista: string | null; razoes: string[]; avisos: string[] } | null;
  opcoes: { veiculoId: string; texto: string }[];
};

export type QuadroDados = {
  segunda: string;
  dias: { iso: string; semana: string; dia: string; hoje: boolean; fds: boolean }[];
  linhas: LinhaQuadro[];
  pendentes: PendenteQuadro[];
  retornos: { matricula: string; local: string; dia: string }[];
  semBase: boolean;
};

export async function montarQuadro(empresaId: string, segunda: string, hoje: string): Promise<QuadroDados> {
  const ctx = await carregarContexto(empresaId);
  const domingo = somarDiasISO(segunda, 6);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const iso = somarDiasISO(segunda, i);
    const r = rotuloDia(iso);
    return { iso, semana: r.semana, dia: r.dia, hoje: iso === hoje, fds: i >= 5 };
  });

  const linhas: LinhaQuadro[] = [];
  const retornos: QuadroDados["retornos"] = [];

  for (const v of ctx.veiculos) {
    const itens: ItemQuadro[] = [];
    const ocupado = new Array<boolean>(7).fill(false);

    for (const s of ctx.servicos) {
      if (s.trator_id !== v.id || !s.inicio || !s.fim || s.estado === "pedido") continue;
      if (s.fim < segunda || s.inicio > domingo) continue;
      const ini = Math.max(0, diferencaDias(segunda, s.inicio));
      const fim = Math.min(6, diferencaDias(segunda, s.fim));
      for (let i = ini; i <= fim; i++) ocupado[i] = true;
      itens.push({
        chave: s.id,
        tipo: "servico",
        col: ini,
        span: fim - ini + 1,
        titulo: `${referencia(s.numero)} ${s.origem} → ${s.destino}`,
        sub: [s.cliente, s.reboque, s.motorista].filter(Boolean).join(" · "),
        estado: s.estado,
        servicoId: s.id,
      });
    }

    // Espaços livres: dias seguidos sem serviço, com o sítio onde o camião fica.
    if (v.estado === "ativo") {
      let i = 0;
      while (i < 7) {
        if (ocupado[i]) {
          i++;
          continue;
        }
        let j = i;
        while (j + 1 < 7 && !ocupado[j + 1]) j++;
        const diaIni = somarDiasISO(segunda, i);
        const onde = localNoDia(ctx, v.id, diaIni);
        const longe = eLonge(ctx, onde.local);
        if (longe && onde.local) retornos.push({ matricula: v.matricula, local: onde.local, dia: diaIni });
        itens.push({
          chave: `livre-${v.id}-${i}`,
          tipo: "livre",
          col: i,
          span: j - i + 1,
          titulo: onde.local ? `Livre em ${onde.local}` : "Livre",
          sub: longe ? "procurar carga de retorno" : j > i ? `${diaCurto(diaIni)} a ${diaCurto(somarDiasISO(segunda, j))}` : diaCurto(diaIni),
          retorno: longe && onde.local ? { local: onde.local, dia: diaIni } : undefined,
        });
        i = j + 1;
      }
    } else {
      itens.push({ chave: `parado-${v.id}`, tipo: "livre", col: 0, span: 7, titulo: "Na oficina", sub: "indisponível", estado: "oficina" });
    }

    const expirado = ctx.docs.find(
      (d) => (d.veiculo_id === v.id || (v.motorista_id && d.motorista_id === v.motorista_id)) && d.data_validade < hoje
    );
    linhas.push({
      id: v.id,
      matricula: v.matricula,
      tipo: v.tipo === "trator" ? "Trator" : "Rígido",
      motorista: v.motorista,
      estado: v.estado,
      aviso: expirado ? `${expirado.tipo} expirado` : null,
      itens,
    });
  }

  // Pedidos por planear, com sugestão para os primeiros (o cálculo de distâncias tem um custo).
  const pedidos = ctx.servicos.filter((s) => s.estado === "pedido");
  const carroc = pedidos.length
    ? await query<{ id: string; carrocaria: string | null; descricao_carga: string | null }>(
        "SELECT id, carrocaria, descricao_carga FROM servicos WHERE empresa_id=$1 AND id = ANY($2::uuid[])",
        [empresaId, pedidos.map((p) => p.id)]
      )
    : [];
  const podeGeocodificar = orcamentoGeocode(6);
  const pendentes: PendenteQuadro[] = [];
  for (const [idx, p] of pedidos.entries()) {
    const extra = carroc.find((c) => c.id === p.id);
    let sugestao: PendenteQuadro["sugestao"] = null;
    let opcoes: PendenteQuadro["opcoes"] = ctx.veiculos.map((v) => ({ veiculoId: v.id, texto: `${v.matricula}${v.motorista ? ` · ${v.motorista}` : ""}` }));
    if (idx < 8) {
      const inicio = p.inicio ?? hoje;
      const sugestoes = await sugerirVeiculos(
        ctx,
        { servicoId: p.id, origem: p.origem, carrocaria: extra?.carrocaria ?? null, inicio, fim: p.fim ?? inicio },
        podeGeocodificar
      );
      const melhor = sugestoes[0];
      if (melhor && melhor.disponivel) {
        sugestao = {
          veiculoId: melhor.veiculo.id,
          matricula: melhor.veiculo.matricula,
          motorista: melhor.veiculo.motorista,
          razoes: melhor.razoes,
          avisos: melhor.avisos,
        };
      }
      opcoes = sugestoes.map((sg) => ({
        veiculoId: sg.veiculo.id,
        texto: `${sg.veiculo.matricula}${sg.veiculo.motorista ? ` · ${sg.veiculo.motorista}` : ""}${sg.kmVazio !== null ? ` · ${sg.kmVazio} km vazio` : ""}${sg.disponivel ? "" : " · ocupado"}`,
      }));
    }
    pendentes.push({
      id: p.id,
      ref: referencia(p.numero),
      cliente: p.cliente,
      rota: `${p.origem} → ${p.destino}`,
      quando: p.inicio ? diaCurto(p.inicio) : "sem data",
      carga: extra?.descricao_carga ?? null,
      sugestao,
      opcoes,
    });
  }

  return { segunda, dias, linhas, pendentes, retornos, semBase: !ctx.base };
}

export function diaDaSemana(param: string | undefined, hoje: string) {
  const base = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : hoje;
  const d = new Date(base + "T00:00:00Z");
  const dow = d.getUTCDay();
  return somarDiasISO(base, dow === 0 ? -6 : 1 - dow);
}

export { diaLisboa };
