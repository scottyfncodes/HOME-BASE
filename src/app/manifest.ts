import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Home Base",
    short_name: "Home Base",
    description: "Understand, maintain, protect, document, and improve your home.",
    start_url: "/home",
    display: "standalone",
    background_color: "#f6f3ee",
    theme_color: "#1f5f4f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
