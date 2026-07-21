import "./globals.css";
import { Vazirmatn } from "next/font/google";

import { ThemeProvider } from "@/components/shared/theme-provider";

const vazir = Vazirmatn({
  subsets: ["arabic"],
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
        {/* I FEEL GUILTY AF but if it works then it works, God I hate it xD */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var path = window.location.pathname;
                var isPersian = path.startsWith("/fa");

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
