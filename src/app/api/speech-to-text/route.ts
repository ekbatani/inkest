import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import {
  transcribeAudioWithGoogle,
  isGoogleSpeechConfigured,
} from "@/server/speech/google-speech";

export const runtime = "nodejs";

const MAX_AUDIO_SIZE_MB = Number(process.env.MAX_SPEECH_UPLOAD_SIZE_MB ?? 10);
const MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024;

function getEncodingFromMimeType(mimeType: string) {
  if (mimeType === "audio/webm" || mimeType.startsWith("audio/webm;")) {
    return "WEBM_OPUS" as const;
  }

  if (mimeType === "audio/ogg" || mimeType.startsWith("audio/ogg;")) {
    return "OGG_OPUS" as const;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGoogleSpeechConfigured()) {
    return NextResponse.json(
      {
        error:
          "Speech-to-text is not configured. Set GOOGLE_SPEECH_TO_TEXT_API_KEY.",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const languageCode = formData.get("languageCode");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
  }

  const encoding = getEncodingFromMimeType(file.type);
  if (!encoding) {
    return NextResponse.json(
      {
        error:
          "Unsupported audio format. Please record with a browser that supports WebM or OGG audio.",
      },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "The recording is empty." }, { status: 400 });
  }

  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: `Recording is too large. Keep it under ${MAX_AUDIO_SIZE_MB} MB.`,
      },
      { status: 400 },
    );
  }

  const audioBuffer = Buffer.from(await file.arrayBuffer());
  const result = await transcribeAudioWithGoogle({
    audioBase64: audioBuffer.toString("base64"),
    encoding,
    languageCode:
      typeof languageCode === "string" && languageCode.trim().length > 0
        ? languageCode.trim()
        : "en-US",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, notConfigured: result.notConfigured },
      { status: result.notConfigured ? 503 : 400 },
    );
  }

  return NextResponse.json({ transcript: result.transcript });
}
