import type { UserConfig } from "vite";
import type { OutputOptions, OutputBundle, OutputAsset } from "rollup";
import { promises as fs } from "node:fs";
import path from "node:path";

export type PluginConfig = {
  input: string | Array<string> | Record<string, string>;
  publicPath?: string;
};

function collectEntryPoints(
  input: PluginConfig["input"],
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

export default ({ input, publicPath = "../public" }: PluginConfig) => {
  let pluginInputs = collectEntryPoints(input);

  return {
    name: "flame-vite-plugin",
    config: (config: UserConfig, env: { command: string; mode: string }) => {
      const userInput = collectEntryPoints(
        config.build?.rollupOptions?.input || [],
      );
      pluginInputs = { ...userInput, ...pluginInputs };

      return {
        build: {
          manifest: config.build?.manifest ?? ".vite/manifest.json",
          outDir: config.build?.outDir ?? publicPath,
          emptyOutDir: true,
          rollupOptions: {
            input: Object.values(pluginInputs),
          },
        },
      };
    },
    writeBundle: async (options: OutputOptions, bundle: OutputBundle) => {
      const manifestFilename = Object.keys(bundle).find((key) =>
        key.endsWith("manifest.json"),
      );
      if (!manifestFilename) {
        return;
      }
      const src = bundle[manifestFilename] as OutputAsset;
      const manifest = JSON.parse(src.source.toString() || "");

      const filtered: Record<string, string> = {};
      for (const [key, value] of Object.entries(pluginInputs)) {
        if (!key.startsWith("@")) {
          continue;
        }
        filtered[key] = value;
      }
      const targetPath = path.join(publicPath, ".flame");
      return fs.writeFile(
        targetPath,
        JSON.stringify(
          {
            manifest,
            aliases: filtered,
          },
          null,
          "  ",
        ),
        "utf8",
      );
    },
  };
};
