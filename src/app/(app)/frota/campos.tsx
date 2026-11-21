import { CARROCARIAS } from "@/lib/carrocaria";
import { ESTADOS_VEICULO, TIPOS_VEICULO, type Veiculo } from "@/modules/frota/queries";

export function CamposVeiculo({ v, motoristas }: { v?: Veiculo; motoristas: { id: string; nome: string }[] }) {
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
        <input name="matricula" defaultValue={v?.matricula} placeholder="AA-00-BB" required className="mono" autoCapitalize="characters" />
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
        Carroçaria <span className="ajuda">reboques e rígidos</span>
        <select name="carrocaria" defaultValue={v?.carrocaria ?? ""}>
          <option value="">—</option>
          {Object.entries(CARROCARIAS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label>
        Motorista habitual <span className="ajuda">tratores e rígidos</span>
        <select name="motorista_habitual_id" defaultValue={v?.motorista_habitual_id ?? ""}>
          <option value="">—</option>
          {motoristas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
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
        <input name="ano" type="number" inputMode="numeric" min={1950} max={2100} defaultValue={v?.ano ?? ""} />
      </label>
      <label>
        Quilómetros
        <input name="km" type="number" inputMode="numeric" min={0} defaultValue={v?.km ?? ""} />
      </label>
      <label className="campo-largo">
        Notas
        <textarea name="notas" defaultValue={v?.notas ?? ""} />
      </label>
    </div>
  );
}
