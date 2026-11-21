import { CARROCARIAS, type Carrocaria } from "@/lib/carrocaria";
import type { Oferta } from "./queries";

/** Mensagem de proposta, na língua do contacto. Texto fixo (sem IA): previsível e grátis. */
export function textoProposta(o: Oferta, p: { assinatura: string; empresa: string; precoProposto?: number | null }) {
  const data = o.data_carga ? o.data_carga.split("-").reverse().slice(0, 2).join("/") : null;
  const preco = p.precoProposto ?? (o.preco !== null ? Number(o.preco) : null);
  const precoTxt = preco !== null ? preco.toLocaleString("pt-PT", { maximumFractionDigits: 0 }) + " €" : null;
  const carroc = o.carrocaria && o.carrocaria !== "outro" ? CARROCARIAS[o.carrocaria as Carrocaria]?.toLowerCase() : null;
  const nome = o.contacto_nome?.split(" ")[0];
  const carga = o.descricao_carga ? ` (${o.descricao_carga})` : "";

  switch (o.idioma) {
    case "es":
      return [
        `Buenos días${nome ? ` ${nome}` : ""},`,
        `hemos visto vuestra carga ${o.origem} → ${o.destino}${data ? ` del ${data}` : ""}${carga}.`,
        `Tenemos camión${carroc ? ` de ${carroc}` : ""} disponible en la zona${data ? " ese día" : ""}.`,
        precoTxt ? `Podemos hacerla por ${precoTxt}. ¿Nos la confirmas?` : "¿Qué precio tenéis para este transporte?",
        `Un saludo, ${p.assinatura} · ${p.empresa}`,
      ].join("\n");
    case "fr":
      return [
        `Bonjour${nome ? ` ${nome}` : ""},`,
        `nous avons vu votre fret ${o.origem} → ${o.destino}${data ? ` du ${data}` : ""}${carga}.`,
        `Nous avons un camion${carroc ? ` (${carroc})` : ""} disponible dans le secteur.`,
        precoTxt ? `Nous pouvons le faire pour ${precoTxt}. Pouvez-vous confirmer ?` : "Quel est votre prix pour ce transport ?",
        `Cordialement, ${p.assinatura} · ${p.empresa}`,
      ].join("\n");
    case "en":
      return [
        `Hello${nome ? ` ${nome}` : ""},`,
        `we saw your load ${o.origem} → ${o.destino}${data ? ` on ${data}` : ""}${carga}.`,
        `We have a${carroc ? ` ${carroc}` : ""} truck available in the area.`,
        precoTxt ? `We can do it for ${precoTxt}. Can you confirm?` : "What is your rate for this load?",
        `Best regards, ${p.assinatura} · ${p.empresa}`,
      ].join("\n");
    default:
      return [
        `Bom dia${nome ? ` ${nome}` : ""},`,
        `vimos a vossa carga ${o.origem} → ${o.destino}${data ? ` de ${data}` : ""}${carga}.`,
        `Temos camião${carroc ? ` de ${carroc}` : ""} disponível na zona${data ? " nesse dia" : ""}.`,
        precoTxt ? `Podemos fazer por ${precoTxt}. Confirma?` : "Que preço têm para este transporte?",
        `Cumprimentos, ${p.assinatura} · ${p.empresa}`,
      ].join("\n");
  }
}

export function linkWhatsApp(telefone: string | null, texto: string, idioma = "pt") {
  if (!telefone) return null;
  const internacional = /^\s*(\+|00)/.test(telefone);
  let digitos = telefone.replace(/[^\d]/g, "");
  if (telefone.trim().startsWith("00")) digitos = digitos.slice(2);
  // Número sem indicativo: assume o país pela língua do contacto (Portugal ou Espanha, 9 dígitos).
  if (!internacional && digitos.length === 9) digitos = (idioma === "es" ? "34" : "351") + digitos;
  if (digitos.length < 10) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`;
}

export function linkEmail(email: string | null, o: Oferta, texto: string) {
  if (!email) return null;
  return `mailto:${email}?subject=${encodeURIComponent(`${o.origem} → ${o.destino}`)}&body=${encodeURIComponent(texto)}`;
}
