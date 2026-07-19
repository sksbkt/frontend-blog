import type { ReactNode } from "react";

import Navbar from "./navbar";
// import Footer from "./footer";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">{children}</main>

      {/* <Footer /> */}
    </div>
  );
}
