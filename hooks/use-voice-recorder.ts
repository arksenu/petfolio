import { useRef, useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";

export type VoiceRecordingResult = {
  uri: string;
  durationSeconds: number;
  mimeType: string;
};

export type UseVoiceRecorderReturn = {
  isRecording: boolean;
  durationSeconds: number;
  /** null until permissions checked; false if denied */
  permissionGranted: boolean | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<VoiceRecordingResult | null>;
  cancelRecording: () => void;
};

/**
 * Shared hook wrapping expo-audio recording.
 * Returns local file URI + duration on stop.
 * Web: records as webm. Native: records as m4a (HIGH_QUALITY preset).
 */
export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Request permission on mount
  useEffect(() => {
    (async () => {
      try {
        const status = await requestRecordingPermissionsAsync();
        setPermissionGranted(status.granted);
        if (status.granted) {
          await setAudioModeAsync({
            playsInSilentMode: true,
            allowsRecording: true,
          });
        }
      } catch (e) {
        console.warn("[VoiceRecorder] Permission error:", e);
        setPermissionGranted(false);
      }
    })();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (!permissionGranted) {
      const status = await requestRecordingPermissionsAsync();
      if (!status.granted) {
        setPermissionGranted(false);
        return;
      }
      setPermissionGranted(true);
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    }

    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      setDurationSeconds(0);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDurationSeconds(elapsed);
      }, 250); // update 4x/sec for smoother display
    } catch (e) {
      console.error("[VoiceRecorder] Start error:", e);
      setIsRecording(false);
    }
  }, [audioRecorder, permissionGranted]);

  const stopRecording = useCallback(async (): Promise<VoiceRecordingResult | null> => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const finalDuration = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
    setIsRecording(false);
    setDurationSeconds(0);

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) return null;

      // Determine mime type based on platform
      const mimeType = Platform.OS === "web" ? "audio/webm" : "audio/m4a";

      return {
        uri,
        durationSeconds: finalDuration,
        mimeType,
      };
    } catch (e) {
      console.error("[VoiceRecorder] Stop error:", e);
      return null;
    }
  }, [audioRecorder]);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setDurationSeconds(0);

    try {
      audioRecorder.stop();
    } catch {
      // ignore errors on cancel
    }
  }, [audioRecorder]);

  return {
    isRecording,
    durationSeconds,
    permissionGranted,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
