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
      { // S3 버킷 호스트네임 추가
        protocol: 'https',
        hostname: 'ums-shop-storage.s3.ap-southeast-2.amazonaws.com',
        port: '',
        pathname: '/**', 
      },
    ],
  }
};

export default withPWA({
  dest: "public",
})(nextConfig);