/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    env: {
        NEXT_PUBLIC_API_KEY_MOLIT: process.env.NEXT_PUBLIC_API_KEY_MOLIT,
        NEXT_PUBLIC_API_KEY_NSDI: process.env.NEXT_PUBLIC_API_KEY_NSDI,
        NEXT_PUBLIC_KAKAO_JS_KEY: process.env.NEXT_PUBLIC_KAKAO_JS_KEY,
        NEXT_PUBLIC_KAKAO_APP_KEY: process.env.NEXT_PUBLIC_KAKAO_APP_KEY,
    },
};

export default nextConfig;
