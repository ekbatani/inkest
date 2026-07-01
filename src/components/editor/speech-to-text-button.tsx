"use client";

import * as React from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { insertTextAtCursor } from "./markdown-editor";

type Props = {
  editorRef: React.RefObject<ReactCodeMirrorRef | null>;
};

const MAX_RECORDING_MS = 55_000;
const DEFAULT_LANGUAGE_CODE = "en-US";

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") return null;

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return null;
}

export function SpeechToTextButton({ editorRef }: Props) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const timeoutRef = React.useRef<number | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);
  const mimeTypeRef = React.useRef<string>("audio/webm");

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stopRecording = React.useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const uploadRecording = React.useCallback(
    async (audioBlob: Blob) => {
      setIsTranscribing(true);
      try {
        const fileExtension = audioBlob.type.includes("ogg") ? "ogg" : "webm";
        const formData = new FormData();
        formData.append(
          "file",
          new File([audioBlob], `speech-note.${fileExtension}`, {
            type: audioBlob.type,
          }),
        );
        formData.append("languageCode", DEFAULT_LANGUAGE_CODE);

        const response = await fetch("/api/speech-to-text", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json().catch(() => null)) as
          | { transcript?: string; error?: string }
          | null;

        if (!response.ok || !data?.transcript) {
          throw new Error(data?.error || "Transcription failed.");
        }

        insertTextAtCursor(editorRef, `${data.transcript} `);
        toast.success("Transcript inserted.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to transcribe audio.",
        );
      } finally {
        setIsTranscribing(false);
      }
    },
    [editorRef],
  );

  const startRecording = React.useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      toast.error("This browser does not support microphone recording.");
      return;
    }

    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      toast.error("This browser cannot record in a supported audio format.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      mimeTypeRef.current = mimeType;
      chunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        setIsRecording(false);

        const audioBlob = new Blob(chunksRef.current, {
          type: mimeTypeRef.current,
        });
        recorder.stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        chunksRef.current = [];

        if (audioBlob.size > 0) {
          void uploadRecording(audioBlob);
        } else {
          toast.error("The recording was empty.");
        }
      });

      recorder.start();
      setIsRecording(true);
      toast.success("Recording started.");

      timeoutRef.current = window.setTimeout(() => {
        toast.message("Recording stopped after 55 seconds.");
        stopRecording();
      }, MAX_RECORDING_MS);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Microphone access was denied.",
      );
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      setIsRecording(false);
    }
  }, [stopRecording, uploadRecording]);

  const onClick = React.useCallback(() => {
    if (isTranscribing) return;

    if (isRecording) {
      stopRecording();
      return;
    }

    void startRecording();
  }, [isRecording, isTranscribing, startRecording, stopRecording]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5"
      onClick={onClick}
      disabled={isTranscribing}
      title={isRecording ? "Stop recording" : "Record speech to text"}
    >
      {isTranscribing ? (
        <Loader2 className="size-4 animate-spin" />
      ) : isRecording ? (
        <Square className="size-4 fill-current text-destructive" />
      ) : (
        <Mic className="size-4" />
      )}
      <span className="hidden sm:inline">
        {isTranscribing ? "Transcribing" : isRecording ? "Stop" : "Voice"}
      </span>
    </Button>
  );
}
