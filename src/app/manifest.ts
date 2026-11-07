import type { MetadataRoute } from "next";

/** Permet d'installer le CRM sur l'écran d'accueil du téléphone. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CRM Prospection",
    short_name: "CRM",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f8",
    theme_color: "#ea580c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
