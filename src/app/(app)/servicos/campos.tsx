import { paraInputDataHora } from "@/lib/formato";
import type { ServicoLinha } from "@/modules/servicos/queries";

export function CamposServico({
  s,
  clientes,
  clientePredefinido,
}: {
  s?: ServicoLinha;
  clientes: { id: string; nome: string }[];
  clientePredefinido?: string;
}) {
  return (
    <div className="campos">
      <label className="campo-largo">
        Cliente
        <select name="cliente_id" defaultValue={s?.cliente_id ?? clientePredefinido ?? ""}>
          <option value="">— Sem cliente —</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>
      <label>
        Origem
        <input name="origem" defaultValue={s?.origem} placeholder="Guimarães" required />
      </label>
      <label>
        Destino
        <input name="destino" defaultValue={s?.destino} placeholder="Madrid" required />
      </label>
      <label>
        Data e hora de carga
        <input name="data_carga" type="datetime-local" defaultValue={paraInputDataHora(s?.data_carga)} />
      </label>
      <label>
        Data e hora de entrega prevista
        <input name="data_entrega" type="datetime-local" defaultValue={paraInputDataHora(s?.data_entrega)} />
      </label>
      <label>
        Carga
        <input name="descricao_carga" defaultValue={s?.descricao_carga ?? ""} placeholder="Paletes de têxtil" />
      </label>
      <label>
        Peso (kg)
        <input name="peso_kg" type="number" min={0} step="0.01" defaultValue={s?.peso_kg ?? ""} />
      </label>
      <label>
        Preço acordado (€)
        <input name="preco" type="number" min={0} step="0.01" defaultValue={s?.preco ?? ""} />
      </label>
      <label className="campo-largo">
        Notas
        <textarea name="notas" defaultValue={s?.notas ?? ""} />
      </label>
    </div>
  );
}
