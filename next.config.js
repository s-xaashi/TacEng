/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bbksqsgupyytiahmbzmk.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};
module.exports = nextConfig;
