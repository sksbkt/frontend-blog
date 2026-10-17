import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { FaGithub as Github, FaExternalLinkAlt as ExternalLink } from "react-icons/fa";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { getDbProjectBySlug } from "@/lib/services/project-service";
import { TechBadgeGroup } from "@/components/ui/tech-badge-group";
import { LanguageBar } from "@/components/ui/language-bar";
import { ProjectAuditBadge } from "@/components/projects/project-audit-badge";
import { GlobalTooltipProvider } from "@/components/ui/custom-tooltip";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export default async function DirectProjectSlugPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const [messages, project] = await Promise.all([
    getMessages({ locale: "en" }),
    getDbProjectBySlug(slug),
  ]);

  if (!project) {
    notFound();
  }

  const language = "en";

  return (
    <NextIntlClientProvider messages={messages} locale="en">
      <GlobalTooltipProvider delayDuration={150} skipDelayDuration={100}>
        <main className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="overflow-hidden rounded-2xl border bg-card">
              {project.image && (
                <div className="relative aspect-video overflow-hidden">
                  <Image
                    src={project.image}
                    alt={project.title[language] || project.slug}
                    fill
                    priority
                    unoptimized={Boolean(project.image?.includes("supabase.co"))}
                    className="object-cover"
                  />
                </div>
              )}

              <div className="p-6 md:p-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <span className="text-sm font-medium uppercase tracking-widest text-primary">
                    Project
                  </span>
                  <ProjectAuditBadge project={project} isAdmin={false} locale="en" />
                </div>

                <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
                  {project.title[language] || project.slug}
                </h1>

                <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
                  {project.description[language] || ""}
                </p>

                <div className="mt-8">
                  <TechBadgeGroup
                    technologies={project.technologies}
                    limit={8}
                    size="md"
                  />
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  {project.github && (
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <Github className="size-4" />
                      GitHub
                    </a>
                  )}

                  {project.demo && (
                    <a
                      href={project.demo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <ExternalLink className="size-4" />
                      Live Demo
                    </a>
                  )}
                </div>
              </div>
            </div>

            <section className="mt-16 grid gap-12 md:grid-cols-3">
              <div className="md:col-span-2">
                <span className="text-sm font-medium uppercase tracking-widest text-primary">
                  About
                </span>

                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Overview
                </h2>

                <p className="mt-4 text-lg leading-8 text-muted-foreground">
                  {project.content.overview[language]}
                </p>
              </div>

              <aside className="space-y-8">
                {(project.languages || project.rawLanguages) && (
                  <div className="rounded-xl border bg-card p-5 space-y-3 shadow-xs">
                    <h3 className="font-semibold text-sm text-foreground">
                      Languages & Technologies
                    </h3>
                    <LanguageBar
                      languages={project.languages}
                      rawLanguages={project.rawLanguages}
                      barHeight="md"
                      showLegend={true}
                    />
                  </div>
                )}

                {/* Engineering Telemetry Grid & Architecture Scorecard */}
                <div className="rounded-xl border bg-card p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-primary" />
                      <span>Engineering Telemetry</span>
                    </h3>
                    <ProjectAuditBadge project={project} isAdmin={false} locale="en" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-muted/40 p-2 rounded-lg">
                      <span className="text-muted-foreground block text-[10px]">
                        Storage Engine
                      </span>
                      <span className="font-bold text-foreground">Supabase S3</span>
                    </div>
                    <div className="bg-muted/40 p-2 rounded-lg">
                      <span className="text-muted-foreground block text-[10px]">
                        Asset Storage
                      </span>
                      <span className="font-bold text-foreground">
                        {project.auditBreakdown?.breakdown?.assets ?? 100}%
                      </span>
                    </div>
                    <div className="bg-muted/40 p-2 rounded-lg">
                      <span className="text-muted-foreground block text-[10px]">
                        Languages
                      </span>
                      <span className="font-bold text-foreground">
                        {project.auditBreakdown?.breakdown?.languages ?? 95}%
                      </span>
                    </div>
                    <div className="bg-muted/40 p-2 rounded-lg">
                      <span className="text-muted-foreground block text-[10px]">
                        Taxonomy
                      </span>
                      <span className="font-bold text-foreground">
                        {project.auditBreakdown?.breakdown?.technologies ?? 100}%
                      </span>
                    </div>
                  </div>

                  {Boolean(project.auditBreakdown?.strengths?.length) && (
                    <div className="space-y-1.5 pt-1 border-t border-border/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                        Strengths
                      </span>
                      <ul className="space-y-1">
                        {project.auditBreakdown!.strengths.slice(0, 3).map((s: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5 text-xs text-foreground/90">
                            <CheckCircle2 className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </aside>
            </section>

            <div className="mt-16">
              <Link
                href="/projects"
                className="inline-flex items-center gap-1.5 text-sm font-medium leading-none text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4 shrink-0" />
                <span>Back to projects</span>
              </Link>
            </div>
          </div>
        </main>
      </GlobalTooltipProvider>
    </NextIntlClientProvider>
  );
}
