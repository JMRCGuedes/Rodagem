import { paraInputDataHora } from "@/lib/formato";
import { CARROCARIAS } from "@/lib/carrocaria";
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
        Morada de carga <span className="ajuda">para o motorista navegar</span>
        <input name="morada_carga" defaultValue={s?.morada_carga ?? ""} placeholder="Armazém, rua, cais" />
      </label>
      <label>
        Morada de entrega
        <input name="morada_entrega" defaultValue={s?.morada_entrega ?? ""} />
      </label>
      <label>
        Contacto na carga
        <input name="contacto_carga" type="tel" defaultValue={s?.contacto_carga ?? ""} />
      </label>
      <label>
        Contacto na entrega
        <input name="contacto_entrega" type="tel" defaultValue={s?.contacto_entrega ?? ""} />
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
        Carroçaria necessária
        <select name="carrocaria" defaultValue={s?.carrocaria ?? ""}>
          <option value="">Qualquer</option>
          {Object.entries(CARROCARIAS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label>
        Referência do cliente
        <input name="referencia_cliente" defaultValue={s?.referencia_cliente ?? ""} />
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
