import type { Motorista } from "@/modules/motoristas/queries";

export function CamposMotorista({ m }: { m?: Motorista }) {
  return (
    <div className="campos">
      <label>
        Nome
        <input name="nome" defaultValue={m?.nome} required autoComplete="off" />
      </label>
      <label>
        NIF
        <input name="nif" defaultValue={m?.nif ?? ""} inputMode="numeric" />
      </label>
      <label>
        Telefone
        <input name="telefone" type="tel" defaultValue={m?.telefone ?? ""} />
      </label>
      <label>
        Email
        <input name="email" type="email" defaultValue={m?.email ?? ""} />
      </label>
      <label>
        Categorias da carta
        <input name="categorias_carta" defaultValue={m?.categorias_carta ?? ""} placeholder="B, C, CE" />
      </label>
      <label>
        Situação
        <select name="ativo" defaultValue={m?.ativo === false ? "nao" : "sim"}>
          <option value="sim">Ativo</option>
          <option value="nao">Inativo (saiu da empresa)</option>
        </select>
      </label>
      <label className="campo-largo">
        Notas
        <textarea name="notas" defaultValue={m?.notas ?? ""} />
      </label>
    </div>
  );
}
