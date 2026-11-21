import "server-only";
import { z } from "zod";

/**
 * Extração de ofertas de carga com IA. O fornecedor escolhe-se por variáveis de ambiente:
 *   IA_FORNECEDOR = anthropic | gemini | openai   (vazio = IA desligada)
 *   IA_CHAVE      = chave da API do fornecedor
 *   IA_MODELO     = opcional; por omissão um modelo barato de cada fornecedor
 * A IA só preenche um formulário: a pessoa confirma antes de guardar.
 */

export const ofertaExtraidaSchema = z.object({
  origem: z.string().nullable().catch(null),
  destino: z.string().nullable().catch(null),
  data_carga: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().catch(null),
  data_entrega: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().catch(null),
  peso_kg: z.number().nullable().catch(null),
  descricao_carga: z.string().nullable().catch(null),
  carrocaria: z
    .enum(["lona", "frigorifico", "caixa", "cisterna", "porta_contentores", "basculante", "plataforma", "outro"])
    .nullable()
    .catch(null),
  preco: z.number().nullable().catch(null),
  empresa_anunciante: z.string().nullable().catch(null),
  contacto_nome: z.string().nullable().catch(null),
  contacto_telefone: z.string().nullable().catch(null),
  contacto_email: z.string().nullable().catch(null),
  idioma: z.enum(["pt", "es", "fr", "en"]).catch("pt"),
});
export type OfertaExtraida = z.infer<typeof ofertaExtraidaSchema>;

const MODELOS_PADRAO: Record<string, string> = {
  anthropic: "claude-haiku-5-5",
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
};

export function iaConfigurada() {
  const f = process.env.IA_FORNECEDOR;
  return Boolean(f && f in MODELOS_PADRAO && process.env.IA_CHAVE);
}

export function nomeFornecedorIA() {
  return { anthropic: "Claude", gemini: "Gemini", openai: "OpenAI" }[process.env.IA_FORNECEDOR ?? ""] ?? null;
}

function instrucoes(hoje: string) {
  return `És um assistente de uma transportadora portuguesa. Recebes uma oferta de carga copiada de uma bolsa de cargas (Wtransnet, Teleroute…) ou de um email/WhatsApp, em português, espanhol, francês ou inglês.
Hoje é ${hoje}. Extrai os dados e responde APENAS com um objeto JSON, sem texto à volta, com estas chaves:
- origem, destino: localidade de carga e de descarga, como "Cidade, País" (ex.: "Madrid, Espanha"). Se houver código postal, inclui-o antes da cidade.
- data_carga, data_entrega: "AAAA-MM-DD". Se só houver dia e mês, usa o ano mais próximo no futuro.
- peso_kg: número em quilogramas (converte toneladas).
- descricao_carga: texto curto (ex.: "26 paletes de têxtil").
- carrocaria: uma de lona, frigorifico, caixa, cisterna, porta_contentores, basculante, plataforma, outro.
- preco: número em euros, sem IVA, se indicado.
- empresa_anunciante, contacto_nome, contacto_telefone (com indicativo, ex.: "+34 600 000 000"), contacto_email.
- idioma: língua em que se deve responder ao contacto (pt, es, fr ou en), deduzida do texto e do indicativo.
Usa null para tudo o que não constar. Nunca inventes dados.`;
}

type Imagem = { mime: string; base64: string };

function primeiroJson(texto: string): unknown {
  const ini = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (ini < 0 || fim <= ini) throw new Error("A IA não devolveu dados.");
  return JSON.parse(texto.slice(ini, fim + 1));
}

async function chamarAnthropic(modelo: string, chave: string, sistema: string, texto: string, imagem?: Imagem) {
  const conteudo: unknown[] = [];
  if (imagem) conteudo.push({ type: "image", source: { type: "base64", media_type: imagem.mime, data: imagem.base64 } });
  conteudo.push({ type: "text", text: texto || "Extrai a oferta da imagem." });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": chave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: modelo, max_tokens: 800, system: sistema, messages: [{ role: "user", content: conteudo }] }),
  });
  if (!r.ok) throw new Error(`Claude respondeu ${r.status}.`);
  const j = (await r.json()) as { content?: { type: string; text?: string }[] };
  return (j.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
}

async function chamarGemini(modelo: string, chave: string, sistema: string, texto: string, imagem?: Imagem) {
  const partes: unknown[] = [];
  if (imagem) partes.push({ inline_data: { mime_type: imagem.mime, data: imagem.base64 } });
  partes.push({ text: texto || "Extrai a oferta da imagem." });
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": chave, "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: sistema }] },
      contents: [{ role: "user", parts: partes }],
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    }),
  });
  if (!r.ok) throw new Error(`Gemini respondeu ${r.status}.`);
  const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
}

async function chamarOpenAI(modelo: string, chave: string, sistema: string, texto: string, imagem?: Imagem) {
  const conteudo: unknown[] = [{ type: "text", text: texto || "Extrai a oferta da imagem." }];
  if (imagem) conteudo.push({ type: "image_url", image_url: { url: `data:${imagem.mime};base64,${imagem.base64}` } });
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${chave}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: modelo,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sistema },
        { role: "user", content: conteudo },
      ],
    }),
  });
  if (!r.ok) throw new Error(`OpenAI respondeu ${r.status}.`);
  const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? "";
}

export async function extrairOferta(texto: string, imagem: Imagem | undefined, hoje: string): Promise<OfertaExtraida> {
  const fornecedor = process.env.IA_FORNECEDOR ?? "";
  const chave = process.env.IA_CHAVE ?? "";
  if (!iaConfigurada()) throw new Error("A IA não está configurada.");
  const modelo = process.env.IA_MODELO || MODELOS_PADRAO[fornecedor]!;
  const sistema = instrucoes(hoje);
  const chamar = fornecedor === "anthropic" ? chamarAnthropic : fornecedor === "gemini" ? chamarGemini : chamarOpenAI;
  const resposta = await chamar(modelo, chave, sistema, texto.slice(0, 6000), imagem);
  return ofertaExtraidaSchema.parse(primeiroJson(resposta));
}
