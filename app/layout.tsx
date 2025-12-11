import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "부동산 탐정 - 실거래가 매칭 서비스",
  description: "공공데이터를 활용한 부동산 실거래가 매칭 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_APP_KEY}&libraries=services`}
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}