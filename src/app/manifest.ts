import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KaelAIChat | Yeni Nesil Yapay Zeka Karakter Platformu",
    short_name: "KaelAIChat",
    description:
      "KaelAIChat ile kendi yapay zeka karakterini oluştur, derin hafıza ve çoklu evren senaryolarında canlı sohbet et.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0612",
    theme_color: "#0a0612",
    orientation: "portrait",
    categories: ["entertainment", "social", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
