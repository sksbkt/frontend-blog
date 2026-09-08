import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";

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
