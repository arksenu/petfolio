import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

/**
 * Upload an audio file to S3 via the server's file upload endpoint,
 * then call the voice transcription endpoint.
 *
 * Returns { audioUrl, transcribedText } on success.
 */
export async function uploadAndTranscribeAudio(
  localUri: string,
  mimeType: string,
  durationSeconds: number,
): Promise<{ audioUrl: string; transcribedText: string }> {
  // Step 1: Read the file as base64
  let base64Data: string;

  if (Platform.OS === "web") {
    // On web, localUri is a blob URL — fetch it and convert
    const response = await fetch(localUri);
    const blob = await response.blob();
    base64Data = await blobToBase64(blob);
  } else {
    // On native, use FileSystem
    base64Data = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  // Step 2: Upload to S3 via tRPC files.upload
  const ext = mimeType === "audio/webm" ? "webm" : "m4a";
  const fileName = `voice-${Date.now()}.${ext}`;

  const apiBase = getApiBaseUrl();
  const token = await Auth.getSessionToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Use direct fetch to the tRPC endpoint for file upload
  const uploadRes = await fetch(`${apiBase}/api/trpc/files.upload`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({
      json: {
        fileName,
        fileType: mimeType,
        base64Data,
      },
    }),
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => "");
    throw new Error(`Upload failed: ${uploadRes.status} ${errText}`);
  }

  const uploadJson = await uploadRes.json();
  // tRPC wraps response in { result: { data: { json: ... } } }
  const audioUrl: string =
    uploadJson?.result?.data?.json?.url ?? uploadJson?.result?.data?.url ?? "";

  if (!audioUrl) {
    throw new Error("Upload succeeded but no URL returned");
  }

  // Step 3: Transcribe via tRPC voice.transcribe
  const transcribeRes = await fetch(`${apiBase}/api/trpc/voice.transcribe`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({
      json: {
        audioUrl,
        language: "en",
      },
    }),
  });

  if (!transcribeRes.ok) {
    const errText = await transcribeRes.text().catch(() => "");
    throw new Error(`Transcription failed: ${transcribeRes.status} ${errText}`);
  }

  const transcribeJson = await transcribeRes.json();
  const transcribedText: string =
    transcribeJson?.result?.data?.json?.text ??
    transcribeJson?.result?.data?.text ??
    "";

  if (!transcribedText) {
    throw new Error("Transcription returned empty text");
  }

  return { audioUrl, transcribedText };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Strip the data:...;base64, prefix
      const base64 = dataUrl.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
