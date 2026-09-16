import { NextResponse } from "next/server";

import { createProjectDraft } from "@/lib/sanity/create-project-draft";

export async function GET() {
  try {
    const project = await createProjectDraft({
      title: {
        en: "React",
        fa: "ری‌اکت",
      },
      slug: "react-content-test",
      description: {
        en: "A JavaScript library for building user interfaces.",
        fa: "یک کتابخانه جاوااسکریپت برای ساخت رابط‌های کاربری.",
      },
      technologies: ["JavaScript", "React"],
      github: "https://github.com/facebook/react",
      demo: "https://react.dev",

      content: {
        overview: {
          en: "React is a JavaScript library for building user interfaces.",
          fa: "ری‌اکت یک کتابخانه جاوااسکریپت برای ساخت رابط‌های کاربری است.",
        },
        challenges: {
          en: "The project focuses on efficiently managing UI updates and component-based application development.",
          fa: "این پروژه بر مدیریت بهینه به‌روزرسانی رابط کاربری و توسعه برنامه‌های مبتنی بر کامپوننت تمرکز دارد.",
        },
        outcome: {
          en: "The project provides a reusable approach to building interactive user interfaces.",
          fa: "این پروژه روشی قابل استفاده مجدد برای ساخت رابط‌های کاربری تعاملی ارائه می‌دهد.",
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Sanity draft with content created.",
      id: project._id,
    });
  } catch (error) {
    console.error("Sanity project draft test error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create Sanity draft.",
      },
      { status: 500 },
    );
  }
}
