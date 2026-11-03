import fs from "fs";
import path from "path";

function walkPages(dir, base = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const routes = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.join(base, entry.name);

    if (entry.isDirectory()) {
      routes.push(...walkPages(full, rel));
    } else if (entry.isFile() && entry.name.endsWith(".astro")) {
      if (entry.name === "index.astro") {
        routes.push("/" + base.replace(/\\/g, "/"));
      } else {
        const route = "/" + rel.replace(".astro", "").replace(/\\/g, "/");
        routes.push(route);
      }
    }
  }

  return routes;
}

export async function GET(context) {
  const site = context.site.href || "https://umitime.com/";
  const manifest = context.manifest;

  let routes = [];

  if (manifest && manifest.routes) {
    // Build mode: Astro manifest includes nested routes
    routes = manifest.routes
      .filter((r) => r.type === "page")
      .map((r) => r.route);
  } else {
    // Dev mode: recursively scan src/pages
    const pagesDir = path.resolve("src/pages");
    routes = walkPages(pagesDir);
  }

  const urls = routes
    .map((route) => {
      const relativeRoute = route.replace(/^\//, "");
      const canonicalRoute = relativeRoute.endsWith("/")
          ? relativeRoute
          : relativeRoute + "/";
      const loc = `${site}${canonicalRoute}`;
      return `
        <url>
          <loc>${loc}</loc>
          <changefreq>weekly</changefreq>
        </url>
      `;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls}
  </urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml"
    }
  });
}
