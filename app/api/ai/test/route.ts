import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment variables.",
        },
        { status: 500 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = [
      process.env.GEMINI_MODEL,
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash",
    ].filter((m): m is string => Boolean(m));

    let lastError: unknown = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: "Reply with exactly: Gemini API connection works.",
        });

        return NextResponse.json({
          success: true,
          message: response.text?.trim() ?? "No response.",
          model,
        });
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error("Failed to connect to any Gemini model.");
  } catch (error) {
    console.error("Gemini test error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gemini API request failed.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
