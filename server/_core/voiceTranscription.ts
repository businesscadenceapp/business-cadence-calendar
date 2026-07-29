/**
 * Voice transcription helper using the Whisper API via the built-in Forge API.
 * Converts speech audio to text for meeting notes.
 */

import { ENV } from "./env";

export interface TranscriptionResult {
  text: string;
  language: string;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
}

export interface TranscribeAudioOptions {
  /** URL to the audio file (https:// or data: URI) */
  audioUrl: string;
  /** Optional language hint (ISO-639-1, e.g. "en") */
  language?: string;
  /** Optional context hint to improve accuracy */
  prompt?: string;
}

/**
 * Transcribe an audio file using the Whisper API.
 * Accepts a URL to a pre-uploaded audio file or a data: URI.
 */
export async function transcribeAudio(options: TranscribeAudioOptions): Promise<TranscriptionResult> {
  const { audioUrl, language, prompt } = options;

  const apiUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!apiUrl || !apiKey) {
    throw new Error("Voice transcription API not configured.");
  }

  // If it's a data: URI, convert to a Blob for the multipart form
  let audioBlob: Blob;
  let filename = "recording.webm";

  if (audioUrl.startsWith("data:")) {
    const [header, base64Data] = audioUrl.split(",");
    const mimeType = header.split(":")[1]?.split(";")[0] ?? "audio/webm";
    const ext = mimeType.split("/")[1]?.split(";")[0] ?? "webm";
    filename = `recording.${ext}`;
    const byteChars = atob(base64Data ?? "");
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    audioBlob = new Blob([bytes], { type: mimeType });
  } else {
    // Fetch the audio from the URL
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);
    audioBlob = await response.blob();
    const ext = audioBlob.type.split("/")[1]?.split(";")[0] ?? "webm";
    filename = `recording.${ext}`;
  }

  const formData = new FormData();
  formData.append("file", audioBlob, filename);
  formData.append("model", "whisper-1");
  if (language) formData.append("language", language);
  if (prompt) formData.append("prompt", prompt);
  formData.append("response_format", "verbose_json");

  const response = await fetch(`${apiUrl}/v1/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription API error ${response.status}: ${errorText}`);
  }

  const result = await response.json() as {
    text: string;
    language?: string;
    segments?: Array<{ id: number; start: number; end: number; text: string }>;
  };

  return {
    text: result.text,
    language: result.language ?? language ?? "en",
    segments: result.segments,
  };
}
