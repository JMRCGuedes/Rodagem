import Link from "next/link";
import { dataHoraPt, numeroPt } from "@/lib/formato";
import type { ServicoLinha } from "@/modules/servicos/queries";
import { referencia } from "@/modules/servicos/estados";
import { avisarAtraso, comunicarProblema, marcarCarga } from "@/modules/motorista/actions";
import { ActionForm } from "@/components/ActionForm";
import { EstadoTag } from "@/components/ui";

function linkNavegar(morada: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(morada)}`;
}

function telefone(t: string) {
  return `tel:${t.replace(/[^\d+]/g, "")}`;
}

function Paragem({
  rotulo,
  local,
  morada,
  contacto,
  rotuloContacto,
  quando,
  ativa,
}: {
  rotulo: string;
  local: string;
  morada: string | null;
  contacto: string | null;
  rotuloContacto: string;
  quando: string | null;
  ativa: boolean;
}) {
  return (
    <div className="paragem">
      <span className={`paragem-ponto${ativa ? " ativa" : ""}`} aria-hidden="true" />
      <div className="paragem-texto">
        <div className="paragem-rotulo">
          {rotulo}
          {quando ? ` · ${quando}` : ""}
        </div>
        <div className="paragem-local">{local}</div>
        {morada && <div className="muted small">{morada}</div>}
        <div className="paragem-acoes">
          <a href={linkNavegar(morada ?? local)} target="_blank" rel="noopener" className="btn-mini btn-mini-azul">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 11l18-8-8 18-2-8z" />
            </svg>
            Navegar
          </a>
          {contacto && (
            <a href={telefone(contacto)} className="btn-mini">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
              </svg>
              {rotuloContacto}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/** Ordem de serviço do motorista: rota, moradas, carga e as ações do momento. */
export function CartaoServicoMotorista({ s, telefoneEscritorio }: { s: ServicoLinha; telefoneEscritorio?: string | null }) {
  const hora = (d: string | null) => (d ? dataHoraPt(d) : null);
  return (
    <>
      <section className="cartao ordem">
        <div className="ordem-topo">
          <span className="muted small">
            {referencia(s.numero)}
            {s.trator ? ` · ${s.trator}` : ""}
            {s.reboque ? ` + ${s.reboque}` : ""}
          </span>
          <EstadoTag estado={s.estado} />
        </div>
        <div className="ordem-rota">
          {s.origem} → {s.destino}
        </div>

        <div className="paragens">
          <Paragem
            rotulo="Carga"
            local={s.origem}
            morada={s.morada_carga}
            contacto={s.contacto_carga}
            rotuloContacto="Ligar ao local"
            quando={hora(s.data_carga)}
            ativa={s.estado === "planeado"}
          />
          <Paragem
            rotulo="Entrega"
            local={s.destino}
            morada={s.morada_entrega}
            contacto={s.contacto_entrega}
            rotuloContacto="Ligar ao destino"
            quando={hora(s.data_entrega)}
            ativa={s.estado === "em_curso"}
          />
        </div>

        <dl className="ordem-dados">
          <div>
            <dt>Mercadoria</dt>
            <dd>
              {s.descricao_carga ?? "—"}
              {s.peso_kg ? ` · ${numeroPt(s.peso_kg, " kg")}` : ""}
            </dd>
          </div>
          <div>
            <dt>Referência</dt>
            <dd>{s.referencia_cliente ?? "—"}</dd>
          </div>
          {s.cliente && (
            <div>
              <dt>Cliente</dt>
              <dd>{s.cliente}</dd>
            </div>
          )}
          {s.notas && (
            <div className="largo">
              <dt>Nota do escritório</dt>
              <dd>{s.notas}</dd>
            </div>
          )}
        </dl>
      </section>

      {s.estado === "planeado" && (
        <ActionForm action={marcarCarga.bind(null, s.id)} submitLabel="Carreguei, vou a caminho" className="form btn-bloco">
          {null}
        </ActionForm>
      )}
      {s.estado === "em_curso" && (
        <Link href={`/motorista/${s.id}/entrega`} className="btn btn-primario btn-enorme" style={{ background: "var(--ok)" }}>
          Registar entrega
        </Link>
      )}

      {(s.estado === "planeado" || s.estado === "em_curso") && (
        <div className="motorista-extra">
          <details className="cartao">
            <summary style={{ color: "var(--warn)" }}>Vou atrasar</summary>
            <ActionForm action={avisarAtraso.bind(null, s.id)} submitLabel="Avisar o escritório" variante="secundario">
              <fieldset>
                <legend>Quanto tempo?</legend>
                <div className="checks">
                  {[
                    ["30", "30 min"],
                    ["60", "1 hora"],
                    ["120", "2 horas"],
                    ["240", "Mais"],
                  ].map(([v, l]) => (
                    <label key={v} className="check">
                      <input type="radio" name="minutos" value={v} required /> {l}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label>
                Motivo <span className="ajuda">opcional</span>
                <input name="motivo" placeholder="Trânsito, espera no cais…" />
              </label>
            </ActionForm>
          </details>
          <details className="cartao">
            <summary style={{ color: "var(--err)" }}>Problema</summary>
            <ActionForm action={comunicarProblema.bind(null, s.id)} submitLabel="Enviar ao escritório" variante="secundario">
              <label>
                Tipo
                <select name="tipo_problema" defaultValue="">
                  <option value="">Escolher…</option>
                  <option>Avaria</option>
                  <option>Acidente</option>
                  <option>Carga recusada</option>
                  <option>Mercadoria danificada</option>
                  <option>Outro</option>
                </select>
              </label>
              <label>
                O que aconteceu?
                <textarea name="descricao" required />
              </label>
              <label>
                Onde?
                <input name="local" />
              </label>
            </ActionForm>
          </details>
          {telefoneEscritorio && (
            <a href={telefone(telefoneEscritorio)} className="btn btn-secundario">
              Ligar ao escritório
            </a>
          )}
        </div>
      )}
    </>
  );
}
