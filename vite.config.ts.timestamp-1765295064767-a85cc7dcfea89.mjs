// vite.config.ts
import { defineConfig } from "file:///D:/projectU/node_modules/vite/dist/node/index.js";
import react from "file:///D:/projectU/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///D:/projectU/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // generate a service worker and inject the registration helper
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "DateU",
        short_name: "DateU",
        description: "Meaningful connections, made in college.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        // app-style window (no Chrome UI)
        orientation: "portrait",
        background_color: "#0f0f14",
        theme_color: "#ff3366",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        // cache typical static assets and provide SPA navigation fallback
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
        // set true if you want to test SW in dev; otherwise use build+preview
      }
    })
  ],
  esbuild: { jsx: "automatic" },
  optimizeDeps: { esbuildOptions: { loader: { ".js": "jsx" } } }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxwcm9qZWN0VVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxccHJvamVjdFVcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L3Byb2plY3RVL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIFZpdGVQV0Eoe1xuICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXG4gICAgICAvLyBnZW5lcmF0ZSBhIHNlcnZpY2Ugd29ya2VyIGFuZCBpbmplY3QgdGhlIHJlZ2lzdHJhdGlvbiBoZWxwZXJcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnZmF2aWNvbi5zdmcnLCAnaWNvbnMvYXBwbGUtdG91Y2gtaWNvbi5wbmcnXSxcbiAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgIG5hbWU6ICdEYXRlVScsXG4gICAgICAgIHNob3J0X25hbWU6ICdEYXRlVScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnTWVhbmluZ2Z1bCBjb25uZWN0aW9ucywgbWFkZSBpbiBjb2xsZWdlLicsXG4gICAgICAgIHN0YXJ0X3VybDogJy8nLFxuICAgICAgICBzY29wZTogJy8nLFxuICAgICAgICBkaXNwbGF5OiAnc3RhbmRhbG9uZScsICAgICAgICAgICAvLyBhcHAtc3R5bGUgd2luZG93IChubyBDaHJvbWUgVUkpXG4gICAgICAgIG9yaWVudGF0aW9uOiAncG9ydHJhaXQnLFxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnIzBmMGYxNCcsXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnI2ZmMzM2NicsXG4gICAgICAgIGljb25zOiBbXG4gICAgICAgICAgeyBzcmM6ICcvaWNvbnMvaWNvbi0xOTIucG5nJywgc2l6ZXM6ICcxOTJ4MTkyJywgdHlwZTogJ2ltYWdlL3BuZycgfSxcbiAgICAgICAgICB7IHNyYzogJy9pY29ucy9pY29uLTUxMi5wbmcnLCBzaXplczogJzUxMng1MTInLCB0eXBlOiAnaW1hZ2UvcG5nJyB9LFxuICAgICAgICAgIHsgc3JjOiAnL2ljb25zL21hc2thYmxlLTE5Mi5wbmcnLCBzaXplczogJzE5MngxOTInLCB0eXBlOiAnaW1hZ2UvcG5nJywgcHVycG9zZTogJ21hc2thYmxlJyB9LFxuICAgICAgICAgIHsgc3JjOiAnL2ljb25zL21hc2thYmxlLTUxMi5wbmcnLCBzaXplczogJzUxMng1MTInLCB0eXBlOiAnaW1hZ2UvcG5nJywgcHVycG9zZTogJ21hc2thYmxlJyB9XG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICB3b3JrYm94OiB7XG4gICAgICAgIC8vIGNhY2hlIHR5cGljYWwgc3RhdGljIGFzc2V0cyBhbmQgcHJvdmlkZSBTUEEgbmF2aWdhdGlvbiBmYWxsYmFja1xuICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsc3ZnLHBuZyxpY28sd29mZjJ9J10sXG4gICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9mb250c1xcLihnb29nbGVhcGlzfGdzdGF0aWMpXFwuY29tXFwvLiovaSxcbiAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnZ29vZ2xlLWZvbnRzJyxcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjogeyBtYXhFbnRyaWVzOiAzMCwgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1IH0sXG4gICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7IHN0YXR1c2VzOiBbMCwgMjAwXSB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46ICh7IHJlcXVlc3QgfSkgPT4gcmVxdWVzdC5kZXN0aW5hdGlvbiA9PT0gJ2ltYWdlJyxcbiAgICAgICAgICAgIGhhbmRsZXI6ICdTdGFsZVdoaWxlUmV2YWxpZGF0ZScsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2ltYWdlcycsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogMTAwLCBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzMCB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZTogeyBzdGF0dXNlczogWzAsIDIwMF0gfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICBkZXZPcHRpb25zOiB7XG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlLCAvLyBzZXQgdHJ1ZSBpZiB5b3Ugd2FudCB0byB0ZXN0IFNXIGluIGRldjsgb3RoZXJ3aXNlIHVzZSBidWlsZCtwcmV2aWV3XG4gICAgICB9LFxuICAgIH0pLFxuICBdLFxuICBlc2J1aWxkOiB7IGpzeDogJ2F1dG9tYXRpYycgfSxcbiAgb3B0aW1pemVEZXBzOiB7IGVzYnVpbGRPcHRpb25zOiB7IGxvYWRlcjogeyAnLmpzJzogJ2pzeCcgfSB9IH0sXG59KSJdLAogICJtYXBwaW5ncyI6ICI7QUFBdU4sU0FBUyxvQkFBb0I7QUFDcFAsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUV4QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixjQUFjO0FBQUE7QUFBQSxNQUVkLGVBQWUsQ0FBQyxlQUFlLDRCQUE0QjtBQUFBLE1BQzNELFVBQVU7QUFBQSxRQUNSLE1BQU07QUFBQSxRQUNOLFlBQVk7QUFBQSxRQUNaLGFBQWE7QUFBQSxRQUNiLFdBQVc7QUFBQSxRQUNYLE9BQU87QUFBQSxRQUNQLFNBQVM7QUFBQTtBQUFBLFFBQ1QsYUFBYTtBQUFBLFFBQ2Isa0JBQWtCO0FBQUEsUUFDbEIsYUFBYTtBQUFBLFFBQ2IsT0FBTztBQUFBLFVBQ0wsRUFBRSxLQUFLLHVCQUF1QixPQUFPLFdBQVcsTUFBTSxZQUFZO0FBQUEsVUFDbEUsRUFBRSxLQUFLLHVCQUF1QixPQUFPLFdBQVcsTUFBTSxZQUFZO0FBQUEsVUFDbEUsRUFBRSxLQUFLLDJCQUEyQixPQUFPLFdBQVcsTUFBTSxhQUFhLFNBQVMsV0FBVztBQUFBLFVBQzNGLEVBQUUsS0FBSywyQkFBMkIsT0FBTyxXQUFXLE1BQU0sYUFBYSxTQUFTLFdBQVc7QUFBQSxRQUM3RjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFNBQVM7QUFBQTtBQUFBLFFBRVAsY0FBYyxDQUFDLHNDQUFzQztBQUFBLFFBQ3JELGtCQUFrQjtBQUFBLFFBQ2xCLGdCQUFnQjtBQUFBLFVBQ2Q7QUFBQSxZQUNFLFlBQVk7QUFBQSxZQUNaLFNBQVM7QUFBQSxZQUNULFNBQVM7QUFBQSxjQUNQLFdBQVc7QUFBQSxjQUNYLFlBQVksRUFBRSxZQUFZLElBQUksZUFBZSxLQUFLLEtBQUssS0FBSyxJQUFJO0FBQUEsY0FDaEUsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLEdBQUcsR0FBRyxFQUFFO0FBQUEsWUFDMUM7QUFBQSxVQUNGO0FBQUEsVUFDQTtBQUFBLFlBQ0UsWUFBWSxDQUFDLEVBQUUsUUFBUSxNQUFNLFFBQVEsZ0JBQWdCO0FBQUEsWUFDckQsU0FBUztBQUFBLFlBQ1QsU0FBUztBQUFBLGNBQ1AsV0FBVztBQUFBLGNBQ1gsWUFBWSxFQUFFLFlBQVksS0FBSyxlQUFlLEtBQUssS0FBSyxLQUFLLEdBQUc7QUFBQSxjQUNoRSxtQkFBbUIsRUFBRSxVQUFVLENBQUMsR0FBRyxHQUFHLEVBQUU7QUFBQSxZQUMxQztBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0EsWUFBWTtBQUFBLFFBQ1YsU0FBUztBQUFBO0FBQUEsTUFDWDtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFNBQVMsRUFBRSxLQUFLLFlBQVk7QUFBQSxFQUM1QixjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLE9BQU8sTUFBTSxFQUFFLEVBQUU7QUFDL0QsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
