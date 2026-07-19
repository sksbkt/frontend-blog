import "./globals.css";
import { Vazirmatn } from "next/font/google";

<<<<<<< HEAD
=======
const vazir = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazir",
  display: "swap",
});

>>>>>>> 6ddb357ab6d372f8efe4b6479c871364fe6dc349
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
