import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "NAERA Convoyage",
    short_name: "NAERA",
    description: "Estimer, organiser, tarifer et suivre des missions de convoyage automobile.",
    lang: "fr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f5f7",
    theme_color: "#f4f5f7",
    categories: ["business", "productivity", "travel"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Raccourcis par espace : l'accès reste contrôlé par le serveur (401/403 sinon).
    shortcuts: [
      { name: "Espace professionnel", short_name: "Pro", url: "/pro/missions" },
      { name: "Mes convoyages", short_name: "Client", url: "/client/missions" },
      { name: "Missions convoyeur", short_name: "Convoyeur", url: "/driver" },
      { name: "Back-office Naera", short_name: "Naera", url: "/admin/missions" },
    ],
  };
}
