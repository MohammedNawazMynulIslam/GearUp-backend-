import { defineConfig } from "tsup";





export default defineConfig({

 entry: ["src/server.ts"],

 format: ["esm"], // Keep this as ESM

 target: "esnext",

 outDir: "dist",

 clean: true,

 bundle: true,

 splitting: false,

 sourcemap: true,

 // Add this banner to shim require() for CJS dependencies
 external: [
    "@prisma/client",
    "prisma/adapter-pg",
    "pg"
],

 banner: {

  js: `

   import { createRequire } from 'module';

   const require = createRequire(import.meta.url);

  `,

 },

});