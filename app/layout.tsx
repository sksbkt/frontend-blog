import localFont from "next/font/local";

import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";

const vazir = localFont({
  src: "../fonts/Vazirmatn-Regular.ttf",
  variable: "--font-vazir",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body className={`${vazir.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
