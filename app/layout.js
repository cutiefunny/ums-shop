import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthInitializer from "@/components/AuthInitializer"; // AuthInitializer import
import { ModalProvider } from "@/contexts/ModalContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {/* [수정] ModalProvider로 앱 전체를 감쌉니다. */}
        <ModalProvider>
          <AuthInitializer>
            {children}
          </AuthInitializer>
        </ModalProvider>
      </body>
    </html>
  );
}

export const metadata = {
  applicationName: "UMS SHOP",
  title: {
    default: "UMS SHOP",
    template: "UMS SHOP",
  },
  description: "UMS SHOP",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UMS SHOP",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "UMS SHOP",
    title: {
      default: "UMS SHOP",
      template: "UMS SHOP",
    },
    description: "UMS SHOP",
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FBC926",
};