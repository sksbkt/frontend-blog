import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import NetworkStatusBar from "@/components/shared/network-status-bar";
import { SnackbarProvider } from "@/components/shared/snackbar/snackbar-provider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SnackbarProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <NetworkStatusBar />
      </div>
    </SnackbarProvider>
  );
}
