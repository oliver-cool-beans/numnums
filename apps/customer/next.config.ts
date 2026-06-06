import type { NextConfig } from "next";

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
    ],
  },
};

export default nextConfig;
