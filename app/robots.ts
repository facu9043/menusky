import type { MetadataRoute } from "next";

// CA-6.8 (decisión del Líder, revisable por el Director): se pide no
// rastrear la carta de cada mesa, los paneles, el login y la API.
// robots.txt no garantiza la baja de páginas ya indexadas.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/m/", "/kitchen", "/floor", "/admin", "/login", "/api"],
    },
    sitemap: "https://menusky.vercel.app/sitemap.xml",
  };
}
