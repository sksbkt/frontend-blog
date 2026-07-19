import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function Logo() {
  return (
    <Link
      href="/"
      className="text-xl font-bold tracking-tight"
    >
      {siteConfig.name}
    </Link>
  );
}
