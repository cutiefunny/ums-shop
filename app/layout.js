import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModalProvider } from '@/contexts/ModalContext';
import { AdminModalProvider } from '@/contexts/AdminModalContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import AuthInitializer from '@/components/AuthInitializer';
import './globals.css';


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
      <head>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-8X1Z3V5F6H" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {/* [수정] Provider들로 앱 전체를 감쌉니다. */}
        <AuthProvider>
          <WishlistProvider>
            <ModalProvider>
              <AuthInitializer>
                {children}
              </AuthInitializer>
            </ModalProvider>
          </WishlistProvider>
        </AuthProvider>
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