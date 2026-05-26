// Post-build: marca dist-worker como ESM y añade extensiones .js a los imports
// relativos que tsc no añadió (TS no agrega extensiones; Node ESM las exige).
//
// Por qué no `"type": "module"` en el package.json raíz: afectaría a Next.js y
// a otras herramientas. Aislar el marcador ESM dentro de dist-worker mantiene
// el contrato del repo sin cambios.

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";

const DIST = resolve("dist-worker");

if (!existsSync(DIST)) {
  console.error("dist-worker no existe — ¿olvidaste correr tsc primero?");
  process.exit(1);
}

// 1. Marca el árbol como ESM.
mkdirSync(DIST, { recursive: true });
writeFileSync(join(DIST, "package.json"), JSON.stringify({ type: "module" }, null, 2));

// 2. Añade .js a los imports relativos en los .js emitidos.
//    Soporta: import ... from "./foo" | "../../bar" → "./foo.js" | "../../bar.js"
//    Solo si el target NO tiene ya .js, .mjs, .json o .cjs.
const RELATIVE_IMPORT_RE =
  /(from\s+["'])(\.\.?\/[^"'\n]+?)(["'])/g;

function shouldRewrite(spec) {
  if (spec.endsWith(".js") || spec.endsWith(".mjs") || spec.endsWith(".cjs") || spec.endsWith(".json")) {
    return false;
  }
  return true;
}

function rewriteFile(filePath) {
  let src = readFileSync(filePath, "utf8");
  let changed = false;
  src = src.replace(RELATIVE_IMPORT_RE, (_, pre, spec, post) => {
    if (!shouldRewrite(spec)) return `${pre}${spec}${post}`;
    changed = true;
    return `${pre}${spec}.js${post}`;
  });
  if (changed) writeFileSync(filePath, src);
  return changed;
}

function walk(dir) {
  let count = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) {
      count += walk(full);
    } else if (full.endsWith(".js")) {
      if (rewriteFile(full)) count++;
    }
  }
  return count;
}

const rewritten = walk(DIST);
console.log(`finalize-worker-build: ${rewritten} archivos actualizados con extensiones .js`);
