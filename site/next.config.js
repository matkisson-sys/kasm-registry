/** @type {import('next').NextConfig} */

const nextConfig = {
  output: 'export',
  distDir: '../public',
  env: {
    name: 'IRAD Dev Repository',
    description: 'The official store for IRAD supported workspaces.',
    icon: '/img/logo.svg',
    listUrl: 'https://matkisson-sys.github.io/kasm-registry/',
    contactUrl: 'https://clearedgeit.com',
  },
  reactStrictMode: true,
  basePath: '/kasm-registry/1.0',
  trailingSlash: true,
  images: {
    unoptimized: true,
  }
}

module.exports = nextConfig
