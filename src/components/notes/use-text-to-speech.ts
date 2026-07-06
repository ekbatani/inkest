"use client";

import * as React from "react";

export type TtsStatus = "idle" | "playing" | "paused";

type TextMap = {
  text: string;
  nodes: { node: Text; start: number; end: number }[];
};

type Sentence = { text: string; start: number; end: number };

function buildTextMap(root: HTMLElement): TextMap {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: TextMap["nodes"] = [];
  let text = "";
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    nodes.push({ node: textNode, start: text.length, end: text.length + textNode.data.length });
    text += textNode.data;
  }
  return { text, nodes };
}

function rangeForOffsets(map: TextMap, start: number, end: number): Range | null {
  const startEntry = map.nodes.find((n) => start >= n.start && start < n.end);
  const endEntry = [...map.nodes].reverse().find((n) => end > n.start && end <= n.end);
  if (!startEntry || !endEntry) return null;
  const range = document.createRange();
  range.setStart(startEntry.node, start - startEntry.start);
  range.setEnd(endEntry.node, end - endEntry.start);
  return range;
}

function splitSentences(text: string): Sentence[] {
  const SegmenterCtor = (Intl as unknown as {
    Segmenter?: new (
      locale: string | undefined,
      opts: { granularity: string },
    ) => { segment: (t: string) => Iterable<{ segment: string; index: number }> };
  }).Segmenter;

  if (SegmenterCtor) {
    const segmenter = new SegmenterCtor(undefined, { granularity: "sentence" });
    const sentences: Sentence[] = [];
    for (const { segment, index } of segmenter.segment(text)) {
      const trimmed = segment.trim();
      if (!trimmed) continue;
      const start = index + segment.indexOf(trimmed);
      sentences.push({ text: trimmed, start, end: start + trimmed.length });
    }
    return sentences;
  }

  const sentences: Sentence[] = [];
  const re = /[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const raw = match[0];
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const start = match.index + raw.indexOf(trimmed);
    sentences.push({ text: trimmed, start, end: start + trimmed.length });
  }
  return sentences;
}

function supportsCustomHighlight() {
  return (
    typeof CSS !== "undefined" &&
    "highlights" in CSS &&
    typeof (globalThis as { Highlight?: unknown }).Highlight === "function"
  );
}

const HIGHLIGHT_NAME = "tts-active-sentence";

export function useTextToSpeech({
  getBlocks,
  rate,
  voiceURI,
  onActiveBlockChange,
}: {
  getBlocks: () => HTMLElement[];
  rate: number;
  voiceURI: string | undefined;
  onActiveBlockChange?: (index: number | null) => void;
}) {
  const [status, setStatus] = React.useState<TtsStatus>("idle");
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  const queueRef = React.useRef<{ blockIndex: number; sentence: Sentence; block: HTMLElement }[]>(
    [],
  );
  const queuePosRef = React.useRef(0);
  const rateRef = React.useRef(rate);
  const voiceURIRef = React.useRef(voiceURI);
  const speakFromRef = React.useRef<(pos: number) => void>(() => {});
  const sessionRef = React.useRef(0);

  React.useEffect(() => {
    rateRef.current = rate;
  }, [rate]);
  React.useEffect(() => {
    voiceURIRef.current = voiceURI;
  }, [voiceURI]);

  React.useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const clearHighlight = React.useCallback(() => {
    if (supportsCustomHighlight()) {
      CSS.highlights.delete(HIGHLIGHT_NAME);
    }
  }, []);

  const stop = React.useCallback(() => {
    sessionRef.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    queueRef.current = [];
    queuePosRef.current = 0;
    clearHighlight();
    setStatus("idle");
    onActiveBlockChange?.(null);
  }, [clearHighlight, onActiveBlockChange]);

  React.useEffect(() => stop, [stop]);

  const speakFrom = React.useCallback(
    (pos: number) => {
      const queue = queueRef.current;
      if (pos >= queue.length) {
        stop();
        return;
      }

      const session = sessionRef.current;
      const entry = queue[pos];
      const utterance = new SpeechSynthesisUtterance(entry.sentence.text);
      utterance.rate = rateRef.current;
      if (voiceURIRef.current) {
        const voice = window.speechSynthesis
          .getVoices()
          .find((v) => v.voiceURI === voiceURIRef.current);
        if (voice) utterance.voice = voice;
      }

      utterance.onstart = () => {
        if (session !== sessionRef.current) return;
        queuePosRef.current = pos;
        onActiveBlockChange?.(entry.blockIndex);
        clearHighlight();
        if (supportsCustomHighlight()) {
          const map = buildTextMap(entry.block);
          const range = rangeForOffsets(map, entry.sentence.start, entry.sentence.end);
          if (range) {
            const HighlightCtor = (globalThis as unknown as { Highlight: new (r: Range) => unknown })
              .Highlight;
            CSS.highlights.set(HIGHLIGHT_NAME, new HighlightCtor(range) as never);
          }
        }
      };

      utterance.onend = () => {
        if (session !== sessionRef.current) return;
        speakFromRef.current(pos + 1);
      };

      utterance.onerror = () => {
        if (session !== sessionRef.current) return;
        stop();
      };

      window.speechSynthesis.speak(utterance);
    },
    [clearHighlight, onActiveBlockChange, stop],
  );

  React.useEffect(() => {
    speakFromRef.current = speakFrom;
  }, [speakFrom]);

  const play = React.useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (status === "paused") {
      window.speechSynthesis.resume();
      setStatus("playing");
      return;
    }

    const blocks = getBlocks();
    if (blocks.length === 0) return;

    const queue: typeof queueRef.current = [];
    blocks.forEach((block, blockIndex) => {
      const text = block.textContent?.trim();
      if (!text) return;
      for (const sentence of splitSentences(text)) {
        queue.push({ blockIndex, sentence, block });
      }
    });

    sessionRef.current += 1;
    window.speechSynthesis.cancel();
    queueRef.current = queue;
    queuePosRef.current = 0;
    setStatus("playing");
    speakFromRef.current(0);
  }, [getBlocks, status]);

  const pause = React.useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  }, []);

  const toggle = React.useCallback(() => {
    if (status === "playing") pause();
    else play();
  }, [pause, play, status]);

  return { status, voices, play, pause, stop, toggle };
}
