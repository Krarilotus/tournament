import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WICHTIG: Standalone Mode für Docker aktivieren
  output: "standalone",
  
  // (Optional) Falls du Bilder von externen Quellen hast, müssen die hier rein.
  // Falls nicht, reicht das oben.
};

export default nextConfig;