import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Sistem Sedang Pemeliharaan",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
