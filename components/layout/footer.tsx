import Link from "next/link";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { Mail } from "lucide-react";

const links = [
  {
    name: "GitHub",
    href: "https://github.com",
    icon: FaGithub,
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com",
    icon: FaLinkedin,
  },
  {
    name: "Email",
    href: "mailto:your-email@example.com",
    icon: Mail,
  },
];

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">Ali</p>

          <p className="mt-1 text-sm text-muted-foreground">
            Frontend Developer
          </p>
        </div>

        <div className="flex gap-4">
          {links.map(({ name, href, icon: Icon }) => (
            <Link
              key={name}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Icon className="size-5" />
              <span className="sr-only">{name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Ali. All rights reserved.
      </div>
    </footer>
  );
}
