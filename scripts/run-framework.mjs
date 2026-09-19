import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readExecutionProfile } from "./execution-profile.mjs";

const [command, ...args] = process.argv.slice(2);
if (!["dev", "build"].includes(command)) throw new Error("Expected dev or build.");
const managedLinux = readExecutionProfile() === "managed-linux";

if (command === "build" && process.env.VERCEL) {
  const next = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
  const result = spawnSync(process.execPath, [next, "build", ...args], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

if (managedLinux && command === "build") {
  const result = spawnSync("bash", [
    fileURLToPath(new URL("./build-verified.sh", import.meta.url)), ...args,
  ], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

// Import in this process so the preview owner retains its PID and signals.
// Next and Vinext generate incompatible route-type files in the same folder.
// Clear Next's generated validator when switching back to the local Vinext runtime.
if (!managedLinux) {
  const validator = new URL("../.next/types/validator.ts", import.meta.url);
  try {
    if (readFileSync(validator, "utf8").startsWith("// This file is generated automatically by Next.js")) rmSync(validator);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const cli = new URL(managedLinux
  ? "../node_modules/vite/bin/vite.js"
  : "../node_modules/vinext/dist/cli.js", import.meta.url);
process.argv = [process.execPath, fileURLToPath(cli), command,
  ...(!managedLinux && command === "dev" ? ["--port", "5173"] : []), ...args];
await import(cli.href);
