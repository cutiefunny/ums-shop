import withPWA from "@ducanh2912/next-pwa";

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**', // 모든 경로의 이미지를 허용
      },
    ],
  }
};

export default withPWA({
  dest: "public",
})(nextConfig);