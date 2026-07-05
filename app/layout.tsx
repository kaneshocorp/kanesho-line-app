import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "金山商店",
  description: "有限会社金山商店 買取価格・管理システム",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#24455c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
