import type { MetadataRoute } from "next";

const BASE = "https://rugby.laserraptorai.duckdns.org";

// Two rules, both earned by measurement (2026-10-17):
//  1. `?_rsc=` URLs are the same page in Next's flight encoding. Crawlers that walk the
//     links embedded in the payload discover them and re-render the page for each one.
//     Blocked for everyone: 20k of them in three hours came from one crawler.
//  2. Nothing here is request-specific, so the pages are worth indexing — but the API
//     snapshot is 2 MB per hit and is fetched by the app itself, never by a visitor.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/*?_rsc=", "/api/", "/data/"] },
    ],
    host: BASE,
  };
}
