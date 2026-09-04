import type { MetadataRoute } from "next";

/**
 * Web App Manifest — makes "Add to Home Screen" install Byzcard as a
 * standalone app that opens directly on the user's local card. Entirely
 * standards-based; icons are repository-local assets.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Byzcard",
    short_name: "Byzcard",
    description: "Your business card, on your phone. Local-first, no account.",
    start_url: "/card",
    scope: "/",
    display: "standalone",
    background_color: "#f7f3ec",
    theme_color: "#f7f3ec",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
