import { NextResponse } from "next/server";

import { writeClient } from "@/lib/sanity/write-client";

export async function GET() {
  try {
    const result = await writeClient.fetch<number>(
      "count(*[_type == 'project'])",
    );

    return NextResponse.json({
      success: true,
      projectCount: result,
    });
  } catch (error) {
    console.error("Sanity write client test error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Sanity connection failed.",
      },
      { status: 500 },
    );
  }
}
