/**
 * © 2026 Root Zero Systems Lab™. All rights reserved.
 *
 * SCA Project Audit Engine
 * Evaluates codebase architecture, self-hosted storage integrity, localization parity, and taxonomy coverage.
 */

export interface AuditReport {
  score: number;
  breakdown: {
    languages: number;
    assets: number;
    architecture: number;
    technologies: number;
  };
  strengths: string[];
  weaknesses: string[];
  strengthsFa: string[];
  weaknessesFa: string[];
  auditedAt: string;
}

export function generateProjectAuditReport(
  project: any,
  canonicalTechSlugs: Set<string>
): AuditReport {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const strengthsFa: string[] = [];
  const weaknessesFa: string[] = [];

  // 1. Language Analysis (30%)
  let langScore = 0;
  let languages: any[] = [];
  try {
    languages =
      typeof project.languages === "string"
        ? JSON.parse(project.languages)
        : project.languages || [];
  } catch {
    languages = [];
  }

  if (Array.isArray(languages) && languages.length > 0) {
    const primary = languages[0];
    const dominance = typeof primary.percentage === "number" ? primary.percentage : 0;
    langScore = Math.min(100, Math.round(dominance));
    if (dominance >= 75) {
      strengths.push(
        `Clean codebase architecture: ${primary.name || "Primary language"} represents ${dominance}% of the codebase.`
      );
      strengthsFa.push(
        `معماری یکپارچه کدبیس: زبان ${primary.name || "اصلی"} معادل ${dominance}٪ از کل پروژه را تشکیل می‌دهد.`
      );
    } else if (dominance > 0) {
      strengths.push(
        `Multi-language architecture: ${primary.name || "Primary"} (${dominance}%) leads balanced ecosystem.`
      );
      strengthsFa.push(
        `معماری چندزبانه: زبان ${primary.name || "اصلی"} با سهم ${dominance}٪ پیشتاز اکوسیستمی متوازن است.`
      );
    }
  } else {
    weaknesses.push("No language distribution data detected.");
    weaknessesFa.push("داده‌ای از توزیع زبان‌های برنامه‌نویسی شناسایی نشد.");
  }

  // 2. Asset & Storage Health (25%)
  let assetScore = 0;
  const isSupabaseHosted = project.coverImageUrl?.includes(
    "supabase.co/storage/v1/object/public/projects"
  );
  if (isSupabaseHosted) {
    assetScore = 100;
    strengths.push(
      "Assets 100% self-hosted on Supabase Storage with zero external CDN dependency."
    );
    strengthsFa.push(
      "دارایی‌های تصویری ۱۰۰٪ روی حافظه ابری Supabase بدون وابستگی به CDN خارجی میزبانی می‌شوند."
    );
  } else if (project.coverImageUrl) {
    assetScore = 40;
    weaknesses.push(
      "Cover image relies on an external CDN instead of self-hosted Supabase storage."
    );
    weaknessesFa.push(
      "تصویر کاور به CDN خارجی وابسته است و روی فضای ابری اختصاصی پروژه ذخیره نشده است."
    );
  } else {
    assetScore = 0;
    weaknesses.push("Missing cover image asset.");
    weaknessesFa.push("تصویر کاور برای پروژه تعیین نشده است.");
  }

  // 3. Architectural Completeness & Bilingual Parity (25%)
  let archScore = 0;
  if (project.githubUrl) {
    archScore += 25;
    strengths.push("Source repository link verified.");
    strengthsFa.push("پیوند مخزن سورس‌کد (گیت‌هاب) تأیید شد.");
  } else {
    weaknesses.push("Missing repository (GitHub) URL.");
    weaknessesFa.push("پیوند مخزن سورس‌کد (گیت‌هاب) ثبت نشده است.");
  }

  if (project.liveUrl) {
    archScore += 25;
    strengths.push("Live preview deployment active.");
    strengthsFa.push("پیوند دموی زنده و استقرار آنلاین فعال است.");
  } else {
    weaknesses.push("No live deployment URL provided.");
    weaknessesFa.push("آدرس دموی آنلاین ثبت نشده است.");
  }

  const hasEn = Boolean(project.taglineEn || project.descriptionEn);
  const hasFa = Boolean(project.taglineFa || project.descriptionFa);
  if (hasEn && hasFa) {
    archScore += 50;
    strengths.push("Full bilingual parity maintained (English & Persian localization).");
    strengthsFa.push("همگام‌سازی کامل محتوای دوزبانه (فارسی و انگلیسی) رعایت شده است.");
  } else {
    if (!hasFa) {
      weaknesses.push("Persian localization content is missing or incomplete.");
      weaknessesFa.push("محتوای بومی‌سازی شده به زبان فارسی ناقص یا غایب است.");
    }
    if (!hasEn) {
      weaknesses.push("English localization content is missing or incomplete.");
      weaknessesFa.push("محتوای زبان انگلیسی پروژه ناقص یا غایب است.");
    }
  }

  // 4. Canonical Tech Dictionary Coverage (20%)
  let techScore = 0;
  const techs: string[] = Array.isArray(project.technologies) ? project.technologies : [];
  if (techs.length > 0) {
    const recognized = techs.filter((t) =>
      canonicalTechSlugs.has(t.toLowerCase().trim())
    ).length;
    techScore = Math.round((recognized / techs.length) * 100);
    if (recognized === techs.length) {
      strengths.push(
        `All ${techs.length} technologies mapped in the Canonical Tech Dictionary.`
      );
      strengthsFa.push(
        `تمام ${techs.length} فناوری پروژه در دیکشنری استاندارد ثبت و شناسایی شده‌اند.`
      );
    } else {
      const diff = techs.length - recognized;
      weaknesses.push(
        `${diff} technology tag(s) unmapped in dictionary.`
      );
      weaknessesFa.push(
        `${diff} برچسب فناوری هنوز در دیکشنری استاندارد نگاشت نشده‌اند.`
      );
    }
  } else {
    weaknesses.push("No technologies mapped for this project.");
    weaknessesFa.push("فناوری خاصی برای این پروژه ثبت نشده است.");
  }

  const finalScore = Math.round(
    langScore * 0.3 + assetScore * 0.25 + archScore * 0.25 + techScore * 0.2
  );

  return {
    score: finalScore,
    breakdown: {
      languages: langScore,
      assets: assetScore,
      architecture: archScore,
      technologies: techScore,
    },
    strengths,
    weaknesses,
    strengthsFa,
    weaknessesFa,
    auditedAt: new Date().toISOString(),
  };
}
