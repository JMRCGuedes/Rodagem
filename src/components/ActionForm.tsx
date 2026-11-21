"use client";

import { useActionState, useTransition, type FormEvent, type ReactNode } from "react";
import type { EstadoAcao } from "@/lib/form";

type Props = {
  action: (prev: EstadoAcao, fd: FormData) => Promise<EstadoAcao>;
  children: ReactNode;
  submitLabel: string;
  className?: string;
  confirmar?: string;
  variante?: "primario" | "secundario" | "perigo";
};

/**
 * Formulário ligado a uma server action. Mostra o erro devolvido pela ação
 * e mantém os valores escritos (não limpa o formulário quando há erro).
 */
export function ActionForm({ action, children, submitLabel, className, confirmar, variante = "primario" }: Props) {
  const [estado, formAction] = useActionState(action, undefined);
  const [pendente, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirmar && !window.confirm(confirmar)) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={onSubmit} className={className ?? "form"}>
      {estado?.erro && (
        <p className="alerta alerta-erro" role="alert">
          {estado.erro}
        </p>
      )}
      {estado?.ok && (
        <p className="alerta alerta-ok" role="status">
          {estado.ok}
        </p>
      )}
      {children}
      <div className="form-acoes">
        <button type="submit" className={`btn btn-${variante}`} disabled={pendente}>
          {pendente ? "A guardar…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
