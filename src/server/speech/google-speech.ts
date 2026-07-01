type GoogleSpeechEncoding = "WEBM_OPUS" | "OGG_OPUS";

type TranscribeAudioInput = {
  audioBase64: string;
  languageCode?: string;
  encoding: GoogleSpeechEncoding;
};

type GoogleSpeechResponse = {
  results?: Array<{
    alternatives?: Array<{
      transcript?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

const GOOGLE_SPEECH_BASE_URL =
  process.env.GOOGLE_SPEECH_TO_TEXT_BASE_URL?.trim() ||
  "https://speech.googleapis.com/v1";

function getGoogleSpeechApiKey() {
  return process.env.GOOGLE_SPEECH_TO_TEXT_API_KEY?.trim() || null;
}

export function isGoogleSpeechConfigured() {
  return Boolean(getGoogleSpeechApiKey());
}

export async function transcribeAudioWithGoogle({
  audioBase64,
  languageCode = "en-US",
  encoding,
}: TranscribeAudioInput) {
  const apiKey = getGoogleSpeechApiKey();
  if (!apiKey) {
    return {
      ok: false as const,
      notConfigured: true,
      error:
        "Google Speech-to-Text is not configured. Set GOOGLE_SPEECH_TO_TEXT_API_KEY.",
    };
  }

  const response = await fetch(
    `${GOOGLE_SPEECH_BASE_URL}/speech:recognize?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        config: {
          encoding,
          languageCode,
          enableAutomaticPunctuation: true,
          model: "latest_long",
        },
        audio: {
          content: audioBase64,
        },
      }),
    },
  );

  const data = (await response.json().catch(() => null)) as GoogleSpeechResponse | null;

  if (!response.ok) {
    return {
      ok: false as const,
      error:
        data?.error?.message ||
        "Google Speech-to-Text request failed.",
    };
  }

  const transcript = (data?.results ?? [])
    .flatMap((result) => result.alternatives ?? [])
    .map((alternative) => alternative.transcript?.trim() || "")
    .filter(Boolean)
    .join("\n");

  if (!transcript) {
    return {
      ok: false as const,
      error: "No speech was detected in the recording.",
    };
  }

  return {
    ok: true as const,
    transcript,
  };
}
