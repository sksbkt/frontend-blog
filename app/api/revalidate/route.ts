import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { parseBody } from "next-sanity/webhook";

interface SanityWebhookPayload {
  _id?: string;
  _type?: string;
  slug?:
    | {
        _type?: string;
        current?: string;
      }
    | string;
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.SANITY_REVALIDATE_SECRET;

    if (!secret) {
      console.error("[Revalidate Webhook] SANITY_REVALIDATE_SECRET is not configured.");
      return NextResponse.json(
        { success: false, message: "Webhook secret is not configured on the server." },
        { status: 500 }
      );
    }

    // Verify cryptographic signature from Sanity GROQ webhook
    const { isValidSignature, body } = await parseBody<SanityWebhookPayload>(
      req,
      secret,
      false
    );

    if (!isValidSignature) {
      return NextResponse.json(
        { success: false, message: "Invalid or missing webhook signature." },
        { status: 401 }
      );
    }

    if (!body?._type) {
      return NextResponse.json(
        { success: false, message: "Bad Request: Missing document _type in payload." },
        { status: 400 }
      );
    }

    const revalidatedTags: string[] = [];

    // Invalidate project tags
    if (body._type === "project") {
      revalidateTag("projects", "max");
      revalidatedTags.push("projects");

      const slugCurrent =
        typeof body.slug === "string" ? body.slug : body.slug?.current;

      if (slugCurrent) {
        const slugTag = `project:${slugCurrent}`;
        revalidateTag(slugTag, "max");
        revalidatedTags.push(slugTag);
      }

      if (body._id) {
        const idTag = `project:${body._id}`;
        revalidateTag(idTag, "max");
        revalidatedTags.push(idTag);
      }
    }

    // Invalidate blog post tags if relevant
    if (body._type === "post") {
      revalidateTag("posts", "max");
      revalidatedTags.push("posts");

      const slugCurrent =
        typeof body.slug === "string" ? body.slug : body.slug?.current;
      if (slugCurrent) {
        const postTag = `post:${slugCurrent}`;
        revalidateTag(postTag, "max");
        revalidatedTags.push(postTag);
      }
    }

    return NextResponse.json({
      success: true,
      revalidated: true,
      now: Date.now(),
      tags: revalidatedTags,
      documentId: body._id,
      documentType: body._type,
    });
  } catch (err: unknown) {
    console.error("[Revalidate Webhook Error]:", err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Error processing revalidation webhook.",
      },
      { status: 500 }
    );
  }
}
