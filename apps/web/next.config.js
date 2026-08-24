/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@acuity/shared", "@acuity/triage-engine"],
  experimental: {
    externalDir: true,
  },
};

module.exports = nextConfig;
