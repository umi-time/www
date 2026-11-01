# Umi‑Time Website

This repository contains the **primary public website for Umi‑Time**, served at:

**https://www.umitime.com**

The site provides:

- The public introduction to Umi‑Time  
- The Manifesto  
- The Specification (embedded via the `spec` submodule)  
- Interactive demos (Clock, Map, Solar Geometry)  
- Supporting documentation and educational material  

It is built with **Astro** and deployed automatically through the repository’s GitHub Pages workflow.

---

## 📄 Specification Submodule

The Umi‑Time Specification is not stored directly in this repository.  
Instead, the website embeds the canonical spec via a Git submodule pointing to:

**https://github.com/umi-time/spec**

This ensures the website always displays the authoritative version of the specification.

### Adding the submodule

From the root of this repository, add the spec as a submodule:

```
git submodule add https://github.com/umi-time/spec.git spec
```

This creates a `spec/` directory whose contents are managed by Git.

### Initializing the submodule (after cloning)

If you clone this repository and the `spec/` directory is empty, initialize it:

```
git submodule update --init --recursive
```

### Updating the spec

To pull the latest version of the specification:

```
git submodule update --remote --merge
git add spec
git commit -m "Update spec submodule"
```

### Using the spec inside Astro

The `/spec` page imports the raw HTML directly from the submodule:

```
import specHtml from '../../spec/spec.html?raw';
```

And renders it:

```
<div set:html={specHtml}></div>
```

### Verifying the submodule

Check `.gitmodules` to confirm the submodule is registered:

```
cat .gitmodules
```

You should see:

```text
[submodule "spec"]
    path = spec
    url = https://github.com/umi-time/spec.git
```


---

## 🚀 Development

### Start the website locally

Install dependencies and start Astro’s development server:

```
npm install
npm run dev
```

This runs the site at `localhost:4321` and watches for changes.

> ⚠️ **Important First-Time Setup Note:** The configuration script that mirrors the specification assets and MathJax fonts into the `public/` directory runs during the build initialization phase. Because of this, you must run `npm run build` at least once before your first local development run to populate those asset folders properly.

### Optional: direct Astro commands

If you prefer to work directly with Astro’s CLI:

```
astro dev
astro build
```

Additional background/logging commands:

```
astro dev --background
astro dev status
astro dev logs
astro dev stop
```

---

## 📁 Project Structure

```text
public/          # Static assets served as-is
  assets/        # Images, icons, media
  css/           # Global stylesheets
  js/            # Client-side scripts
  data/          # Static JSON data

src/
  components/    # Astro components
  layouts/       # Shared page layouts
  pages/         # Route-based pages (/, /spec, /manifesto, /clock, /map, etc.)
  scripts/       # Client-side JS modules used by pages

spec/            # Git submodule pointing to umi-time/spec
CNAME            # Custom domain for GitHub Pages
AGENTS.md        # Developer agent instructions
```

Key points:

- Everything in `public/` is served directly at the site root.  
- Everything in `src/pages/` becomes a route automatically.  
- The specification is **not duplicated** — it is embedded from the `spec` submodule.  
- The `CNAME` file ensures GitHub Pages serves the site at `www.umitime.com`.

---

## 🛠 Build

To generate the production build:

```
npm run build
```

This outputs the static site into:

```text
dist/
```

The `.gitignore` already excludes this directory.

---

## 🌐 Deployment

Deployment is handled automatically via **GitHub Pages**.

The configuration:

- Builds the Astro site  
- Publishes the `dist/` directory  
- Uses the `CNAME` file to serve the site at:

```
www.umitime.com
```

---

## 📚 Documentation

Astro documentation:  
https://docs.astro.build

Useful guides:

- Routing: https://docs.astro.build/en/guides/routing/  
- Components: https://docs.astro.build/en/basics/astro-components/  
- Framework components: https://docs.astro.build/en/guides/framework-components/  
- Content collections: https://docs.astro.build/en/guides/content-collections/  
- Styling: https://docs.astro.build/en/guides/styling/  
- Internationalization: https://docs.astro.build/en/guides/internationalization/
