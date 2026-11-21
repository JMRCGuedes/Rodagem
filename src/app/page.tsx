import { redirect } from "next/navigation";
import { getUtilizador } from "@/lib/auth";
import { paginaInicial } from "@/lib/perfis";

export default async function Inicio() {
  const u = await getUtilizador();
  redirect(u ? paginaInicial(u) : "/login");
}
