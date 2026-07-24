import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { MaintenanceListener } from "@/components/providers/maintenance-listener";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://arsip.kemenag-baritoutara.com"),
  title: {
    default: "SI BETANG | Kemenag Barito Utara",
    template: "%s | SI BETANG",
  },
  description:
    "Portal resmi Sistem Informasi Basis Elektronik Tata Arsip dan Naskah Gabungan Kementerian Agama Kabupaten Barito Utara.",
  keywords: [
    "si betang kemenag",
    "arsip kemenag barito utara",
    "kementerian agama barito utara",
    "pengarsipan digital kemenag",
    "aplikasi arsip kemenag",
    "e-arsip kemenag",
  ],
  authors: [{ name: "Kemenag Barito Utara" }],
  creator: "Kemenag Barito Utara",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://arsip.kemenag-baritoutara.com",
    title: "SI BETANG | Kemenag Barito Utara",
    description:
      "Portal resmi Sistem Informasi Basis Elektronik Tata Arsip dan Naskah Gabungan Kementerian Agama Kabupaten Barito Utara.",
    siteName: "SI BETANG Kemenag Barito Utara",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/kemenag.svg",
    shortcut: "/kemenag.svg",
    apple: "/kemenag.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${jakartaSans.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MaintenanceListener />
        {children}
      </body>
    </html>
  );
}
