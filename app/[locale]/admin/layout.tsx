import React from "react";
import { DeveloperHud } from "@/components/admin/developer-hud";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <DeveloperHud />
    </>
  );
}
