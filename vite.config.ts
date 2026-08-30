import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Hands the Cloudflare Worker the same Supabase project the bundle was built
 * against, by writing it into the asset directory the Worker can already read.
 *
 * The Worker renders social share previews at the edge and needs to query
 * Supabase to do it. Without this it would need its own deploy-time secrets,
 * which would then be free to drift from the ones the app uses. Both values are
 * the browser-safe pair already embedded in the JS bundle — the anon key, never
 * the service role key — and every read the Worker makes is still governed by
 * row-level security.
 */
function shareConfig(env: Record<string, string>): Plugin {
  return {
    name: "1corehub:share-config",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "share-config.json",
        source: JSON.stringify(
          {
            supabaseUrl: env.VITE_SUPABASE_URL ?? "",
            supabaseAnonKey: env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
          },
          null,
          2,
        ),
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    // loadEnv, not process.env: it reads the .env files a local build uses and
    // the prefixed variables CI injects, which is exactly the pair of sources
    // the bundle itself is built from.
    shareConfig(loadEnv(mode, process.cwd(), "VITE_")),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "og-default.png", "logo.svg"],
      manifest: {
        name: "1corehub",
        short_name: "1corehub",
        description: "Courses, community, events, CRM and payments — everything you sell, in one place.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#fafafa",
        theme_color: "#18181b",
        orientation: "portrait",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: "/index.html",
        // The service worker must not answer for the routes the edge rewrites,
        // or a returning visitor would get the cached shell with the previous
        // page's share tags still in its head.
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/checkout\//,
          /^\/workshop\//,
          /^\/course-player\//,
          /^\/sitemap\.xml$/,
          /^\/robots\.txt$/,
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.hostname.endsWith("supabase.co"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
