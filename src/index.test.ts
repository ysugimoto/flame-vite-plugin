import { describe, test, expect } from "vitest";
import flame from "./index";
import { rollup } from "rollup";

describe("Plugin test", () => {
  test("Return expected plugin configuration with string input", () => {
    const plugin = flame({ input: "foo/bar.js" });

    expect(plugin).toMatchObject({
      name: "flame-vite-plugin",
      config: expect.any(Function),
      writeBundle: expect.any(Function),
    });
    const config = plugin.config({}, { command: "build" });
    expect(config).toMatchObject({
      build: {
        manifest: ".vite/manifest.json",
        outDir: "dist",
        rollupOptions: {
          input: ["foo/bar.js"],
        },
      },
    });
  });

  test("Return expected plugin configuration with string array input", () => {
    const plugin = flame({
      input: ["foo/bar.js", "foo/bar.css"],
    });

    expect(plugin).toMatchObject({
      name: "flame-vite-plugin",
      config: expect.any(Function),
      writeBundle: expect.any(Function),
    });
    const config = plugin.config({}, { command: "build" });
    expect(config).toMatchObject({
      build: {
        manifest: ".vite/manifest.json",
        outDir: "dist",
        rollupOptions: {
          input: ["foo/bar.js", "foo/bar.css"],
        },
      },
    });
  });

  test("Return expected plugin configuration with alias object input", () => {
    const plugin = flame({
      input: {
        "foo/bar.js": "foo",
        "hoge/huga.js": "hoge",
      },
    });

    expect(plugin).toMatchObject({
      name: "flame-vite-plugin",
      config: expect.any(Function),
      writeBundle: expect.any(Function),
    });
    const config = plugin.config({}, { command: "build" });
    expect(config).toMatchObject({
      build: {
        manifest: ".vite/manifest.json",
        outDir: "dist",
        rollupOptions: {
          input: ["foo/bar.js", "hoge/huga.js"],
        },
      },
    });
  });
});
