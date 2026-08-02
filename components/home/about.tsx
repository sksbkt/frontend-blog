import Link from "next/link";
import { FaGithub as Github, FaLinkedin as Linkedin } from "react-icons/fa";

const socialLinks = [
  {
    name: "GitHub",
    href: "https://github.com",
    icon: Github,
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com",
    icon: Linkedin,
  },
];

export default function About() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <span className="text-sm font-medium uppercase tracking-widest text-primary">
            About
          </span>

          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            Building thoughtful digital experiences
          </h2>

          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            I'm Ali, a frontend developer focused on creating modern,
            responsive, and accessible web applications. I enjoy turning ideas
            into polished interfaces using React, Next.js, and TypeScript.
          </p>

          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            My focus is writing clean code, creating smooth user experiences,
            and continuously improving my skills through real-world projects.
          </p>

          <div className="mt-8 flex gap-4">
            {socialLinks.map(({ name, href, icon: Icon }) => (
              <Link
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-sm leading-none transition-colors hover:bg-muted"
              >
                <Icon className="size-4" />
                <p className="relative translate-y-0.5">{name}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
