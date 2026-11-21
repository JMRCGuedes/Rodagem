import type { Cliente } from "@/modules/clientes/queries";

export function CamposCliente({ c }: { c?: Cliente }) {
  return (
    <div className="campos">
      <label>
        Nome
        <input name="nome" defaultValue={c?.nome} required />
      </label>
      <label>
        NIF
        <input name="nif" defaultValue={c?.nif ?? ""} inputMode="numeric" />
      </label>
      <label>
        Pessoa de contacto
        <input name="contacto" defaultValue={c?.contacto ?? ""} />
      </label>
      <label>
        Telefone
        <input name="telefone" type="tel" defaultValue={c?.telefone ?? ""} />
      </label>
      <label>
        Email
        <input name="email" type="email" defaultValue={c?.email ?? ""} />
      </label>
      <label>
        Morada
        <input name="morada" defaultValue={c?.morada ?? ""} />
      </label>
      <label className="campo-largo">
        Notas
        <textarea name="notas" defaultValue={c?.notas ?? ""} />
      </label>
    </div>
  );
}
