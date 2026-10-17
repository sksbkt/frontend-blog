import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  regenerateFieldMicro,
  refineBilingualField,
  polishBilingualField,
} from "@/lib/gemini/analyzer";
import { isRateLimitOrCapacityError } from "@/lib/gemini/queue";
import { prisma } from "@/lib/prisma";
import type { AiContextDigest } from "@/components/admin/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized: Admin session required." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);
    const draftId = decodedId.startsWith("drafts.") ? decodedId : `drafts.${decodedId}`;

    const body = await request.json().catch(() => ({}));
    const {
      action,
      fieldName,
      fieldKey,
      sourceLanguage,
      currentText,
      customInstructions,
      clientDigest,
    } = body as {
      action?: "refine" | "polish";
      fieldName?: string;
      fieldKey?: string;
      sourceLanguage?: "en" | "fa";
      currentText?: string;
      customInstructions?: string;
      clientDigest?: AiContextDigest;
    };

    // 1. Retrieve aiContextDigest from client state or from Prisma database
    let digest: AiContextDigest | undefined = clientDigest;

    if (!digest || (!digest.rawDigest && !digest.summary)) {
      const cleanId = decodedId.replace(/^drafts\./, "");
      const dbProject = await prisma.project.findFirst({
        where: {
          OR: [{ id: cleanId }, { slug: cleanId }],
        },
      });

      if (dbProject?.aiContextDigest) {
        digest = dbProject.aiContextDigest as AiContextDigest;
      }
    }

    // 2. Enforce dossier presence
    if (!digest || (!digest.rawDigest && !digest.summary)) {
      return NextResponse.json(
        {
          success: false,
          code: "MISSING_DIGEST",
          message: "Run Deep Scan first to enable AI actions.",
        },
        { status: 400 }
      );
    }

    // 3. Handle dual-tier actions
    if (action === "refine") {
      const targetField = fieldName || fieldKey?.replace(/_(en|fa)$/, "") || "description";
      const result = await refineBilingualField(digest, targetField, customInstructions);
      return NextResponse.json({
        success: true,
        action: "refine",
        fieldName: targetField,
        en: result.en,
        fa: result.fa,
      });
    }

    if (action === "polish") {
      const targetField = fieldName || fieldKey?.replace(/_(en|fa)$/, "") || "description";
      const lang = sourceLanguage || (fieldKey?.endsWith("_fa") ? "fa" : "en");
      const textToPolish = currentText || "";

      const result = await polishBilingualField(
        digest,
        targetField,
        lang,
        textToPolish,
        customInstructions
      );

      return NextResponse.json({
        success: true,
        action: "polish",
        fieldName: targetField,
        en: result.en,
        fa: result.fa,
      });
    }

    // 4. Fallback legacy fieldKey micro-generator
    if (fieldKey) {
      const result = await regenerateFieldMicro(digest, fieldKey, customInstructions);
      return NextResponse.json({
        success: true,
        fieldKey: result.fieldKey,
        value: result.value,
      });
    }

    return NextResponse.json(
      { success: false, message: "A valid action ('refine' | 'polish') or fieldKey is required." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[MicroAIField] Error:", error);
    const isRateLimited = isRateLimitOrCapacityError(error);
    return NextResponse.json(
      {
        success: false,
        message: isRateLimited
          ? "Gemini AI capacity is currently saturated. Please wait a moment and try again."
          : error instanceof Error
          ? error.message
          : "Failed to process AI field request.",
      },
      { status: isRateLimited ? 429 : 500 }
    );
  }
}
