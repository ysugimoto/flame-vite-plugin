import type { UserConfig, ResolvedConfig, ConfigEnv } from "vite";
import type { OutputOptions, OutputBundle, OutputAsset } from "rollup";
import { promises as fs } from "node:fs";
import path from "node:path";

type PluginConfig = {
  input: string | Array<string> | Record<string, string>;
  keepManifest?: boolean;
};

const viteDevServerDefaultHost = "localhost";
const viteDevServerDefaultPort = 5137; // 5173 is vite devserver default port
const viteDefaultManifestFile = ".vite/manifest.json";

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
  manifest: Record<string, Record<string, string | Array<string> | boolean>>;
  isServer: boolean;
};

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

export default ({ input, keepManifest = false }: PluginConfig) => {
  let pluginInputs = collectEntryPoints(input);
  let resolvedConfig: ResolvedConfig;
  let isServer: boolean;
  let isUserManifest: boolean;

  return {
    name: "flame-vite-plugin",
    config(config: UserConfig, { command }: { command: string }) {
      isServer = command === "serve";
      isUserManifest = Boolean(config.build?.manifest);

      const userInput = collectEntryPoints(
        config.build?.rollupOptions?.input || [],
      );
      pluginInputs = { ...userInput, ...pluginInputs };

      return {
        build: {
          manifest: config.build?.manifest ?? viteDefaultManifestFile,
          outDir: config.build?.outDir ?? "dist",
          rollupOptions: {
            ...(config.build?.rollupOptions || {}),
            input: Object.values(pluginInputs),
          },
        },
        server: {
          ...(config.server ?? {}),
          ...(isServer
            ? {
                strictPort: config.server?.strictPort ?? true,
                origin: `http://${config.server?.host ?? viteDevServerDefaultHost}:${config.server?.port ?? viteDevServerDefaultPort}`,
              }
            : {}),
        },
      };
    },
    configResolved: async (config: ResolvedConfig) => {
      resolvedConfig = config;

      if (!isServer) {
        return;
      }

      // Genearate flame manifest here due to writeBundle hook will not call on start server.
      const manifest: Record<string, { file: string; src: string }> = {};
      for (const [key, value] of Object.entries(pluginInputs)) {
        manifest[value] = { file: key, src: key };
      }

      await generateFlameManifest({
        pluginInputs,
        resolvedConfig,
        isServer,
        manifest,
      });
    },

    // After bundle files are written, call this hook
    writeBundle: async (_: OutputOptions, bundle: OutputBundle) => {
      // Get manifest source from generated bundle
      const manifestFilename = Object.keys(bundle).find((key) =>
        key.endsWith("manifest.json"),
      );
      if (!manifestFilename) {
        return;
      }
      const { source } = bundle[manifestFilename] as OutputAsset;
      const manifest = JSON.parse(source.toString() || "");

      // Run parallel
      const promises: Array<Promise<void>> = [
        generateFlameManifest({
          pluginInputs,
          resolvedConfig,
          isServer,
          manifest,
        }),
      ];

      // And delete vite's manifest file if user would not like to have
      if (!isUserManifest && !keepManifest) {
        promises.push(
          fs.unlink(path.join(resolvedConfig.build.outDir, manifestFilename)),
        );
      }

      await Promise.all(promises);
    },
  };
};
