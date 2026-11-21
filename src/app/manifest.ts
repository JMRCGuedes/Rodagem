import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rodagem",
    short_name: "Rodagem",
    description: "Gestão de frota, motoristas e serviços para transportadoras.",
    start_url: "/",
    display: "standalone",
    background_color: "#24262a",
    theme_color: "#24262a",
    lang: "pt-PT",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
