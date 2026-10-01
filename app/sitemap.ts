import type { MetadataRoute } from "next";

// CA-6.8: el sitemap solo publica la landing.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://menusky.vercel.app/",
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
