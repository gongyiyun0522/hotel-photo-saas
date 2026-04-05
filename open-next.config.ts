// open-next.config.ts - minimal config without cache
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // No incremental cache for now - simplifies deployment
});
