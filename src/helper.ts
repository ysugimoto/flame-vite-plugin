import type { ResolvedConfig } from "vite";
import { promises as fs } from "node:fs";
import path from "node:path";

export const viteDevServerDefaultHost = "localhost";
export const viteDevServerDefaultPort = 5137; // 5173 is vite devserver default port
export const viteDefaultManifestFile  = ".vite/manifest.json";

// Get { [alias|filename]: filename } object from plugin input.
export function collectEntryPoints(
  input: string | Array<string> | Record<string, string>,
): Record<string, string> {
  const ret: Record<string, string> = {};
  if (Array.isArray(input)) {
    for (const src of input) {
      ret[src] = src;
    }
    return ret;
  }
  if (typeof input === "string") {
    ret[input] = input;
    return ret;
  }
  for (const [key, value] of Object.entries(input)) {
    const alias = `@${value.replace(/^@/, "")}`;
    ret[alias] = key;
  }
  return ret;
}

// Get deduped library from resolved vite configuration.
export function getDedupedLibrary(config: ResolvedConfig): string {
  const deduped = config.resolve.dedupe;
  // If react plugin is used, deduped library has "react"
  if (deduped.find((v) => v.includes("react"))) {
    return "react";
  }
  // If vue plugin is used, deduped library has "vue"
  if (deduped.find((v) => v.includes("vue"))) {
    return "vue";
  }

  // Otherwise, nothing depend library.
  return "";
}

type GenerateManifestInput = {
  pluginInputs: Record<string, string>;
  resolvedConfig: ResolvedConfig;
  manifest: Record<string, any>;
  isServer: boolean;
}

// Geenrate flame manifest
export async function generateFlameManifest({
  pluginInputs,
  resolvedConfig,
  manifest,
  isServer,
}: GenerateManifestInput): Promise<void> {
  // Get aliases from plugin input
  const aliases: Record<string, string> = {};
  for (const [key, value] of Object.entries(pluginInputs)) {
    if (!key.startsWith("@")) {
      continue;
    }
    aliases[key] = value;
  }

  // Get devServer configurations
  const port = resolvedConfig.server.port ?? viteDevServerDefaultPort;
  const host = resolvedConfig.server.host ?? viteDevServerDefaultHost;
  const library = getDedupedLibrary(resolvedConfig);

  // Generate flame manifest
  const targetPath = path.join(resolvedConfig.build.outDir, ".flame");
  const flameManifest = {
    manifest,
    aliases,
    library,
    isServer,
    port,
    host,
  };

  return fs.writeFile(targetPath, JSON.stringify(flameManifest), "utf8");
}
