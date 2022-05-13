import del from "del";
import fs from "fs-extra";
import glob from "glob";
import gulp from "gulp";
import { rollup } from "rollup";
import resolve from "@rollup/plugin-node-resolve";
import sharp from "sharp";
import sucrase from "@rollup/plugin-sucrase";

async function compileUi() {
  const rollupPlugins = [
    resolve({ extensions: [".js", ".ts"] }),
    sucrase({ exclude: ["node_modules/**"], transforms: ["typescript"] }),
  ];
  const bundle = await rollup({
    input: "source/ui/main.ts",
    plugins: rollupPlugins,
  });
  await bundle.write({
    file: "site/ui.js",
    name: "ui",
    format: "iife",
    sourcemap: true,
  });
}

async function copyFonts() {
  await fs.copy("node_modules/@fontsource", "site/fonts");
}

async function makeThumbnails() {
  glob.sync("source/images/**/*.jpg").forEach(async (src) => {
    await fs.outputFile(
      src.replace(/^source\/images/, "site/images-small"),
      await sharp(src).resize(null, 200).jpeg().toBuffer()
    );
    await fs.outputFile(
      src.replace(/^source\/images/, "site/images-small-and-square"),
      await sharp(src).resize(200, 200).jpeg().toBuffer()
    );
  });
}

async function makeImageSizeFile() {
  const imageSizes = Object.fromEntries(
    await Promise.all(
      glob.sync("site/images*/**/*.jpg").map(async (path) => {
        const { width, height } = await sharp(path).metadata();
        return [path.replace(/^site\//, ""), { width, height }];
      })
    )
  );
  fs.outputFile(
    "site/image-sizes.js",
    `const imageSizes = ${JSON.stringify(imageSizes, null, 2)};`
  );
}

async function copyAsset(name) {
  await fs.copy(`source/${name}`, `site/${name}`);
}

export async function build() {
  await fs.copy("source/index.html", "site/index.html");
  await fs.copy("source/theme.css", "site/theme.css");
  await fs.copy("source/images", "site/images");
  await makeThumbnails();
  await makeImageSizeFile();
  await copyFonts();
  await compileUi();
}

export async function watch() {
  await build();
  gulp.watch("source/index.html", () => copyAsset("index.html"));
  gulp.watch("source/theme.css", () => copyAsset("theme.css"));
  gulp.watch("source/images/**", async () => {
    await copyAsset("images");
    await makeThumbnails();
    await makeImageSizeFile();
  });
  gulp.watch("node_modules/@fontsource", copyFonts);
  gulp.watch("source/ui/**", compileUi);
}

export async function clean() {
  await del("site/**");
}
