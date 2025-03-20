// vite.config.ts
import { vitePlugin as remix } from "file:///Users/karan.kurbur/Desktop/chainlink-datastreams-broadcaster/node_modules/@remix-run/dev/dist/index.js";
import { defineConfig } from "file:///Users/karan.kurbur/Desktop/chainlink-datastreams-broadcaster/node_modules/vite/dist/node/index.js";
import tsconfigPaths from "file:///Users/karan.kurbur/Desktop/chainlink-datastreams-broadcaster/node_modules/vite-tsconfig-paths/dist/index.mjs";
import esbuild from "file:///Users/karan.kurbur/Desktop/chainlink-datastreams-broadcaster/node_modules/esbuild/lib/main.js";
var vite_config_default = defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true
      },
      serverBuildFile: "remix.js",
      buildEnd: async () => {
        await esbuild.build({
          alias: { "~": "./app" },
          outfile: "build/server/index.js",
          entryPoints: ["server/index.ts"],
          external: ["./build/server/*"],
          platform: "node",
          format: "esm",
          packages: "external",
          bundle: true,
          logLevel: "info"
        }).catch((error) => {
          console.error("Error building server:", error);
          process.exit(1);
        });
      }
    }),
    tsconfigPaths()
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMva2FyYW4ua3VyYnVyL0Rlc2t0b3AvY2hhaW5saW5rLWRhdGFzdHJlYW1zLWJyb2FkY2FzdGVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMva2FyYW4ua3VyYnVyL0Rlc2t0b3AvY2hhaW5saW5rLWRhdGFzdHJlYW1zLWJyb2FkY2FzdGVyL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9rYXJhbi5rdXJidXIvRGVza3RvcC9jaGFpbmxpbmstZGF0YXN0cmVhbXMtYnJvYWRjYXN0ZXIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyB2aXRlUGx1Z2luIGFzIHJlbWl4IH0gZnJvbSAnQHJlbWl4LXJ1bi9kZXYnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgdHNjb25maWdQYXRocyBmcm9tICd2aXRlLXRzY29uZmlnLXBhdGhzJztcbmltcG9ydCBlc2J1aWxkIGZyb20gJ2VzYnVpbGQnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVtaXgoe1xuICAgICAgZnV0dXJlOiB7XG4gICAgICAgIHYzX2ZldGNoZXJQZXJzaXN0OiB0cnVlLFxuICAgICAgICB2M19yZWxhdGl2ZVNwbGF0UGF0aDogdHJ1ZSxcbiAgICAgICAgdjNfdGhyb3dBYm9ydFJlYXNvbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBzZXJ2ZXJCdWlsZEZpbGU6ICdyZW1peC5qcycsXG4gICAgICBidWlsZEVuZDogYXN5bmMgKCkgPT4ge1xuICAgICAgICBhd2FpdCBlc2J1aWxkXG4gICAgICAgICAgLmJ1aWxkKHtcbiAgICAgICAgICAgIGFsaWFzOiB7ICd+JzogJy4vYXBwJyB9LFxuICAgICAgICAgICAgb3V0ZmlsZTogJ2J1aWxkL3NlcnZlci9pbmRleC5qcycsXG4gICAgICAgICAgICBlbnRyeVBvaW50czogWydzZXJ2ZXIvaW5kZXgudHMnXSxcbiAgICAgICAgICAgIGV4dGVybmFsOiBbJy4vYnVpbGQvc2VydmVyLyonXSxcbiAgICAgICAgICAgIHBsYXRmb3JtOiAnbm9kZScsXG4gICAgICAgICAgICBmb3JtYXQ6ICdlc20nLFxuICAgICAgICAgICAgcGFja2FnZXM6ICdleHRlcm5hbCcsXG4gICAgICAgICAgICBidW5kbGU6IHRydWUsXG4gICAgICAgICAgICBsb2dMZXZlbDogJ2luZm8nLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLmNhdGNoKChlcnJvcjogdW5rbm93bikgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYnVpbGRpbmcgc2VydmVyOicsIGVycm9yKTtcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgfSksXG4gICAgdHNjb25maWdQYXRocygpLFxuICBdLFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlXLFNBQVMsY0FBYyxhQUFhO0FBQzdZLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sbUJBQW1CO0FBQzFCLE9BQU8sYUFBYTtBQUVwQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsTUFDSixRQUFRO0FBQUEsUUFDTixtQkFBbUI7QUFBQSxRQUNuQixzQkFBc0I7QUFBQSxRQUN0QixxQkFBcUI7QUFBQSxNQUN2QjtBQUFBLE1BQ0EsaUJBQWlCO0FBQUEsTUFDakIsVUFBVSxZQUFZO0FBQ3BCLGNBQU0sUUFDSCxNQUFNO0FBQUEsVUFDTCxPQUFPLEVBQUUsS0FBSyxRQUFRO0FBQUEsVUFDdEIsU0FBUztBQUFBLFVBQ1QsYUFBYSxDQUFDLGlCQUFpQjtBQUFBLFVBQy9CLFVBQVUsQ0FBQyxrQkFBa0I7QUFBQSxVQUM3QixVQUFVO0FBQUEsVUFDVixRQUFRO0FBQUEsVUFDUixVQUFVO0FBQUEsVUFDVixRQUFRO0FBQUEsVUFDUixVQUFVO0FBQUEsUUFDWixDQUFDLEVBQ0EsTUFBTSxDQUFDLFVBQW1CO0FBQ3pCLGtCQUFRLE1BQU0sMEJBQTBCLEtBQUs7QUFDN0Msa0JBQVEsS0FBSyxDQUFDO0FBQUEsUUFDaEIsQ0FBQztBQUFBLE1BQ0w7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNELGNBQWM7QUFBQSxFQUNoQjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
