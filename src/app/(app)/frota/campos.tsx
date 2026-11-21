import { ESTADOS_VEICULO, TIPOS_VEICULO, type Veiculo } from "@/modules/frota/queries";

export function CamposVeiculo({ v }: { v?: Veiculo }) {
  return (
    <div className="campos campos-3">
      <label>
        Tipo
        <select name="tipo" defaultValue={v?.tipo ?? "trator"} required>
          {Object.entries(TIPOS_VEICULO).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label>
        Matrícula
        <input name="matricula" defaultValue={v?.matricula} placeholder="AA-00-BB" required className="mono" />
      </label>
      <label>
        Estado
        <select name="estado" defaultValue={v?.estado ?? "ativo"}>
          {Object.entries(ESTADOS_VEICULO).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label>
        Marca
        <input name="marca" defaultValue={v?.marca ?? ""} placeholder="Volvo, Scania…" />
      </label>
      <label>
        Modelo
        <input name="modelo" defaultValue={v?.modelo ?? ""} />
      </label>
      <label>
        Ano
        <input name="ano" type="number" min={1950} max={2100} defaultValue={v?.ano ?? ""} />
      </label>
      <label>
        Quilómetros
        <input name="km" type="number" min={0} defaultValue={v?.km ?? ""} />
      </label>
      <label className="campo-largo">
        Notas
        <textarea name="notas" defaultValue={v?.notas ?? ""} />
      </label>
    </div>
  );
}
