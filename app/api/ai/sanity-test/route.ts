import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const result = await prisma.project.count();

    return NextResponse.json({
      success: true,
      database: "postgresql",
      projectCount: result,
    });
  } catch (error) {
    console.error("Database health check error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed.",
      },
      { status: 500 },
    );
  }
}
