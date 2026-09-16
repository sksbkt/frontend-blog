import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "user",
              content: "Reply with exactly: OpenRouter connection works.",
            },
          ],
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter error:", data);

      return NextResponse.json(
        {
          success: false,
          message: "OpenRouter request failed.",
          error: data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: data.choices?.[0]?.message?.content ?? "No response.",
    });
  } catch (error) {
    console.error("OpenRouter test error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "OpenRouter request failed.",
      },
      { status: 500 },
    );
  }
}
