// Regenerates src/data/conditions.ts from the backend CSV before the app
// starts or builds (see ../../scripts/generate-guides.mjs). Skips quietly when
// the generator is not there, e.g. in a Docker build that only sees this folder.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const generator = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../scripts/generate-guides.mjs");
if (existsSync(generator)) {
  process.argv[1] = generator; // run it as the main script
  await import(pathToFileURL(generator).href);
} else {
  console.log("[guides] generator not found - using the saved src/data/conditions.ts");
}
