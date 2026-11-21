"use client";

import { useRef, useState, useTransition } from "react";
import { analisarComIA, criarOferta } from "@/modules/cargas/actions";
import type { OfertaExtraida } from "@/lib/ia";
import { CARROCARIAS } from "@/lib/carrocaria";
import { ActionForm } from "@/components/ActionForm";

async function imagemParaBase64(f: File): Promise<{ mime: string; base64: string }> {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      i.src = url;
    });
    const escala = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * escala);
    c.height = Math.round(img.naturalHeight * escala);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.8);
    return { mime: "image/jpeg", base64: dataUrl.slice(dataUrl.indexOf(",") + 1) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

type Props = { iaLigada: boolean; iaNome: string | null; origemSugerida?: string; diaSugerido?: string };

/** Introduzir uma oferta: colar o texto (e/ou uma captura), a IA preenche, a pessoa confirma e guarda. */
export function NovaOferta({ iaLigada, iaNome, origemSugerida, diaSugerido }: Props) {
  const [texto, setTexto] = useState("");
  const [imagem, setImagem] = useState<File | null>(null);
  const [dados, setDados] = useState<Partial<OfertaExtraida> | null>(
    origemSugerida ? { origem: origemSugerida, data_carga: diaSugerido ?? null } : null
  );
  const [versao, setVersao] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [aAnalisar, startTransition] = useTransition();
  const ficheiro = useRef<HTMLInputElement>(null);

  function analisar() {
    setErro(null);
    startTransition(async () => {
      try {
        const img = imagem ? await imagemParaBase64(imagem) : null;
        const r = await analisarComIA(texto, img);
        if (r.erro) setErro(r.erro);
        if (r.dados) {
          setDados(r.dados);
          setVersao((v) => v + 1);
        }
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível analisar.");
      }
    });
  }

  function manual() {
    setDados((d) => d ?? {});
    setVersao((v) => v + 1);
  }

  const v = (x: string | number | null | undefined) => (x === null || x === undefined ? "" : String(x));

  return (
    <section className="cartao nova-oferta">
      <div className="nova-oferta-topo">
        <label className="nova-oferta-texto">
          Nova oferta
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Cola aqui o texto da oferta da Wtransnet, de um email ou do WhatsApp. Ex.: Madrid 24/11 → Porto 25/11, 22 t paletes, 950 €, Javier +34 600…"
          />
        </label>
        <div className="nova-oferta-botoes">
          {iaLigada && (
            <button type="button" className="btn btn-primario" onClick={analisar} disabled={aAnalisar || (!texto.trim() && !imagem)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z" />
              </svg>
              {aAnalisar ? "A analisar…" : "Analisar oferta"}
            </button>
          )}
          {iaLigada && (
            <>
              <button type="button" className="btn btn-secundario" onClick={() => ficheiro.current?.click()}>
                {imagem ? "Trocar captura" : "Juntar captura de ecrã"}
              </button>
              <input
                ref={ficheiro}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(e) => setImagem(e.target.files?.[0] ?? null)}
              />
            </>
          )}
          <button type="button" className="btn btn-secundario" onClick={manual}>
            Preencher à mão
          </button>
        </div>
      </div>
      {imagem && <p className="small muted">Captura: {imagem.name}</p>}
      {!iaLigada && <p className="small muted">A leitura automática com IA está desligada (configura-a em Empresa).</p>}
      {iaLigada && iaNome && <p className="small muted">A leitura automática usa {iaNome}. Confirma sempre os dados antes de guardar.</p>}
      {erro && <p className="alerta alerta-erro">{erro}</p>}

      {dados && (
        <div className="nova-oferta-form">
          <ActionForm key={versao} action={criarOferta} submitLabel="Guardar e avaliar">
            <input type="hidden" name="texto_original" value={texto} />
            <div className="campos campos-3">
              <label>
                Origem
                <input name="origem" defaultValue={v(dados.origem)} required placeholder="Madrid, Espanha" />
              </label>
              <label>
                Destino
                <input name="destino" defaultValue={v(dados.destino)} required placeholder="Porto, Portugal" />
              </label>
              <label>
                Fonte
                <select name="fonte" defaultValue="wtransnet">
                  <option value="wtransnet">Wtransnet</option>
                  <option value="teleroute">Teleroute</option>
                  <option value="direto">Cliente direto</option>
                  <option value="outro">Outra</option>
                </select>
              </label>
              <label>
                Data de carga
                <input name="data_carga" type="date" defaultValue={v(dados.data_carga)} />
              </label>
              <label>
                Data de entrega
                <input name="data_entrega" type="date" defaultValue={v(dados.data_entrega)} />
              </label>
              <label>
                Preço (€)
                <input name="preco" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={v(dados.preco)} />
              </label>
              <label>
                Mercadoria
                <input name="descricao_carga" defaultValue={v(dados.descricao_carga)} />
              </label>
              <label>
                Peso (kg)
                <input name="peso_kg" type="number" min={0} step="1" inputMode="numeric" defaultValue={v(dados.peso_kg)} />
              </label>
              <label>
                Carroçaria
                <select name="carrocaria" defaultValue={v(dados.carrocaria)}>
                  <option value="">Qualquer</option>
                  {Object.entries(CARROCARIAS).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Empresa que anuncia
                <input name="empresa_anunciante" defaultValue={v(dados.empresa_anunciante)} />
              </label>
              <label>
                Contacto
                <input name="contacto_nome" defaultValue={v(dados.contacto_nome)} />
              </label>
              <label>
                Telefone
                <input name="contacto_telefone" type="tel" defaultValue={v(dados.contacto_telefone)} placeholder="+34 600 000 000" />
              </label>
              <label>
                Email
                <input name="contacto_email" type="email" defaultValue={v(dados.contacto_email)} />
              </label>
              <label>
                Língua do contacto
                <select name="idioma" defaultValue={dados.idioma ?? "pt"}>
                  <option value="pt">Português</option>
                  <option value="es">Espanhol</option>
                  <option value="fr">Francês</option>
                  <option value="en">Inglês</option>
                </select>
              </label>
            </div>
          </ActionForm>
        </div>
      )}
    </section>
  );
}
