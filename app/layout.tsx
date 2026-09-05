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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var path = window.location.pathname;
                var isPersian = path === "/fa" || path.startsWith("/fa/");

                document.documentElement.lang = isPersian ? "fa" : "en";
                document.documentElement.dir = isPersian ? "rtl" : "ltr";
              })();
            `,
          }}
        />
      </head>
      <body className={`${vazir.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
