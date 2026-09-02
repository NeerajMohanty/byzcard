import type { MetadataRoute } from "next";

/**
 * Web App Manifest — makes "Add to Home Screen" install BYZCARD as a
 * standalone app that opens directly on the user's local card. Entirely
 * standards-based; icons are repository-local assets.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BYZCARD",
    short_name: "BYZCARD",
    description: "Your business card, on your phone. Local-first, no account.",
    start_url: "/card",
    scope: "/",
    display: "standalone",
    background_color: "#05070d",
    theme_color: "#05070d",
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
