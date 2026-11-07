import type { MetadataRoute } from "next";

/** Permet d'installer le CRM sur l'écran d'accueil du téléphone. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CRM SolveLab",
    short_name: "CRM SolveLab",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0710",
    theme_color: "#0b0710",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
