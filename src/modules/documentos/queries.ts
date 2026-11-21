import "server-only";
import { query } from "@/lib/db";

export const TIPOS_DOC_VEICULO = [
  "Inspeção periódica",
  "Seguro",
  "IUC",
  "Licença comunitária / alvará",
  "Calibração do tacógrafo",
  "Certificado ATP (frio)",
  "Outro",
];

export const TIPOS_DOC_MOTORISTA = [
  "Carta de condução",
  "CAM",
  "Cartão de condutor (tacógrafo)",
  "Exame médico",
  "Certificado ADR",
  "Cartão de cidadão",
  "Outro",
];

export const TIPOS_DOC_EMPRESA = ["Alvará / licença de transporte", "Seguro de mercadorias", "Cartão de empresa (tacógrafo)", "Outro"];

export type Documento = {
  id: string;
  veiculo_id: string | null;
  motorista_id: string | null;
  tipo: string;
  numero: string | null;
  data_emissao: string | null;
  data_validade: string | null;
  notas: string | null;
};

export type Dono = { veiculoId?: string; motoristaId?: string };

export async function listarDocumentos(empresaId: string, dono: Dono) {
  const filtro = dono.veiculoId
    ? "veiculo_id = $2"
    : dono.motoristaId
      ? "motorista_id = $2"
      : "veiculo_id IS NULL AND motorista_id IS NULL";
  const params: unknown[] = [empresaId];
  if (dono.veiculoId) params.push(dono.veiculoId);
  else if (dono.motoristaId) params.push(dono.motoristaId);
  return query<Documento>(
    `SELECT id, veiculo_id, motorista_id, tipo, numero, data_emissao, data_validade, notas
       FROM documentos
      WHERE empresa_id = $1 AND ${filtro}
      ORDER BY data_validade NULLS LAST, tipo`,
    params
  );
}
