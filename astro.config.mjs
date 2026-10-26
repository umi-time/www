import { defineConfig } from "astro/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export default defineConfig({
  vite: {
    plugins: [
      {
        name: "copy-spec-assets",
        apply: "build",
        buildStart() {
          // 1. Resolve absolute root path dynamically
          const currentDir = path.dirname(fileURLToPath(import.meta.url));
          const specRoot = path.resolve(currentDir, "spec");

          // 2. Define exact source paths matching your repository tree
          const cssSrc = path.join(specRoot, "css", "spec.css");
          const jsSrc = path.join(specRoot, "js", "spec.js");
          const mathjaxLoaderSrc = path.join(specRoot, "vendor", "mathjax-full", "es5", "tex-mml-chtml.js");
          const fontSrcDir = path.join(specRoot, "vendor", "mathjax-full", "es5", "output", "chtml", "fonts", "woff-v2");

          // 3. Define public target destination directories
          const cssDestDir = path.resolve(currentDir, "public", "css");
          const jsDestDir = path.resolve(currentDir, "public", "js");
          const mathJaxJsDestDir = path.resolve(currentDir, "public", "vendor", "mathjax-full", "es5");
          const fontDestDir = path.resolve(currentDir, "public", "vendor", "mathjax-full", "es5", "output", "chtml", "fonts", "woff-v2");

          // Ensure target directories exist
          fs.mkdirSync(cssDestDir, { recursive: true });
          fs.mkdirSync(jsDestDir, { recursive: true });
          fs.mkdirSync(fontDestDir, { recursive: true });
          fs.mkdirSync(mathJaxJsDestDir, { recursive: true });

          // Execute atomic file syncs
          console.log("[Umi-Time Build] Mirroring specification assets into public directory...");
          
          fs.copyFileSync(cssSrc, path.join(cssDestDir, "spec.css"));
          fs.copyFileSync(jsSrc, path.join(jsDestDir, "spec.js"));
          fs.copyFileSync(mathjaxLoaderSrc, path.join(mathJaxJsDestDir, "tex-mml-chtml.js"));

          // Batch copy font files safely
          if (fs.existsSync(fontSrcDir)) {
            fs.readdirSync(fontSrcDir).forEach((file) => {
              fs.copyFileSync(
                path.join(fontSrcDir, file),
                path.join(fontDestDir, file)
              );
            });
            console.log("[Umi-Time Build] Offline MathJax font layouts successfully compiled.");
          } else {
            throw new Error(`[Umi-Time Build Error] MathJax font directory not found at: ${fontSrcDir}`);
          }
        },
      },
    ],
  },
  compressHTML: false,
});
