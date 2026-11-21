"use client";

import { useActionState, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import type { EstadoAcao } from "@/lib/form";

const MAX_FOTOS = 4;
const LADO_MAX = 1600;

/** Reduz a foto no telemóvel antes de enviar (menos dados móveis, envio mais rápido). */
async function reduzir(ficheiro: File): Promise<Blob> {
  const url = URL.createObjectURL(ficheiro);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Não foi possível ler a foto."));
      i.src = url;
    });
    const escala = Math.min(1, LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha a comprimir a foto."))), "image/jpeg", 0.65)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function FormEntrega({ action }: { action: (prev: EstadoAcao, fd: FormData) => Promise<EstadoAcao> }) {
  const [estado, formAction] = useActionState(action, undefined);
  const [pendente, startTransition] = useTransition();
  const [fotos, setFotos] = useState<{ blob: Blob; url: string }[]>([]);
  const [reservas, setReservas] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [aProcessar, setAProcessar] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function adicionar(e: ChangeEvent<HTMLInputElement>) {
    const lista = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!lista.length) return;
    setErroFoto(null);
    setAProcessar(true);
    try {
      const novas: { blob: Blob; url: string }[] = [];
      for (const f of lista.slice(0, MAX_FOTOS - fotos.length)) {
        const blob = await reduzir(f);
        novas.push({ blob, url: URL.createObjectURL(blob) });
      }
      setFotos((x) => [...x, ...novas]);
    } catch (err) {
      setErroFoto(err instanceof Error ? err.message : "Não foi possível usar a foto.");
    } finally {
      setAProcessar(false);
    }
  }

  function remover(i: number) {
    setFotos((x) => {
      URL.revokeObjectURL(x[i]!.url);
      return x.filter((_, j) => j !== i);
    });
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fotos.length) {
      setErroFoto("Tira uma foto da guia assinada.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    fotos.forEach((f, i) => fd.append("fotos", f.blob, `guia-${i + 1}.jpg`));
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={enviar} className="form entrega">
      {estado?.erro && (
        <p className="alerta alerta-erro" role="alert">
          {estado.erro}
        </p>
      )}

      <fieldset className="sem-borda">
        <legend>Guia de transporte (CMR) assinada</legend>
        <div className="fotos-grelha">
          {fotos.map((f, i) => (
            <div key={f.url} className="foto-miniatura">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={`Página ${i + 1} da guia`} />
              <button type="button" onClick={() => remover(i)} aria-label={`Remover foto ${i + 1}`}>
                ×
              </button>
            </div>
          ))}
          {fotos.length < MAX_FOTOS && (
            <button type="button" className="foto-adicionar" onClick={() => input.current?.click()} disabled={aProcessar}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              {aProcessar ? "A preparar…" : fotos.length ? "Outra página" : "Tirar foto da guia"}
            </button>
          )}
        </div>
        <input ref={input} type="file" accept="image/*" capture="environment" multiple hidden onChange={adicionar} />
        {erroFoto && <p className="alerta alerta-erro">{erroFoto}</p>}
      </fieldset>

      <label>
        Quem recebeu
        <input name="recebido_por" autoComplete="off" placeholder="Nome de quem assinou" />
      </label>

      <fieldset className="sem-borda">
        <legend>Estado da mercadoria</legend>
        <div className="opcoes-grandes">
          <label className={`opcao-grande${!reservas ? " escolhida-ok" : ""}`}>
            <input type="radio" name="reservas" value="nao" checked={!reservas} onChange={() => setReservas(false)} /> Sem reservas
          </label>
          <label className={`opcao-grande${reservas ? " escolhida-aviso" : ""}`}>
            <input type="radio" name="reservas" value="sim" checked={reservas} onChange={() => setReservas(true)} /> Com reservas
          </label>
        </div>
      </fieldset>

      <label>
        Observações {reservas ? <span className="ajuda">obrigatório: o que ficou anotado na guia</span> : <span className="ajuda">opcional</span>}
        <textarea name="observacoes" required={reservas} placeholder="Ex.: 2 paletes com caixas amolgadas; espera de 40 min" />
      </label>

      <div className="entrega-rodape">
        <button type="submit" className="btn btn-enorme" style={{ background: "var(--ok)", color: "#fff" }} disabled={pendente || aProcessar}>
          {pendente ? "A enviar…" : "Confirmar entrega"}
        </button>
        <p className="muted small">O escritório vê logo a entrega e a foto da guia.</p>
      </div>
    </form>
  );
}
