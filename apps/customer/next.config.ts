import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.everyplate.com",
      },
      {
        protocol: "https",
        hostname: "imvmyuwcmyspwdvvbfsj.supabase.co",
      },
      {
        protocol: "https",
        hostname: "dm.apac.cms.aldi.cx",
      },
    ],
  },
};

export default withSerwist(nextConfig);
