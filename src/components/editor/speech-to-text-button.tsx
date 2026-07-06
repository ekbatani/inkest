"use client";

import * as React from "react";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { insertTextAtCursor } from "./markdown-editor-utils";

type Props = {
  editorRef: React.RefObject<ReactCodeMirrorRef | null>;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
};

type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

const DEFAULT_LANGUAGE_CODE = "en-US";
const subscribeToSpeechRecognitionSupport = () => () => {};

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;

  const browserWindow = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

  return (
    browserWindow.SpeechRecognition ??
    browserWindow.webkitSpeechRecognition ??
    null
  );
}

function getBrowserSpeechRecognitionSupport() {
  return getSpeechRecognitionConstructor() !== null;
}

function getSpeechRecognitionErrorMessage(error: string) {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was blocked.";
    case "no-speech":
      return "No speech was detected.";
    case "audio-capture":
      return "No microphone was found.";
    case "network":
      return "Speech recognition needs a working browser connection.";
    default:
      return "Speech recognition stopped unexpectedly.";
  }
}

export function SpeechToTextButton({ editorRef }: Props) {
  const isSupported = React.useSyncExternalStore(
    subscribeToSpeechRecognitionSupport,
    getBrowserSpeechRecognitionSupport,
    () => false,
  );
  const [isListening, setIsListening] = React.useState(false);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);

  React.useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const stopListening = React.useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startListening = React.useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = DEFAULT_LANGUAGE_CODE;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        if (result.isFinal) {
          transcript += result[0]?.transcript ?? "";
        }
      }

      const trimmedTranscript = transcript.trim();
      if (trimmedTranscript) {
        insertTextAtCursor(editorRef, `${trimmedTranscript} `);
      }
    };

    recognition.onerror = (event) => {
      toast.error(getSpeechRecognitionErrorMessage(event.error));
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      recognitionRef.current = null;
      setIsListening(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "Speech recognition could not start.",
      );
    }
  }, [editorRef]);

  const onClick = React.useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }

    startListening();
  }, [isListening, startListening, stopListening]);

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5"
      onClick={onClick}
      title={isListening ? "Stop speech to text" : "Start speech to text"}
    >
      {isListening ? (
        <Square className="size-4 fill-current text-destructive" />
      ) : (
        <Mic className="size-4" />
      )}
      <span className="hidden sm:inline">{isListening ? "Stop" : "Voice"}</span>
    </Button>
  );
}
