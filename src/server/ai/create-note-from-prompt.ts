import { runJsonAction } from "./runner";
import {
  buildAiSystemPrompt,
  buildAiUserPrompt,
  createSchemaParser,
  QuickCaptureNoteSchema,
} from "./specs";

export async function createNoteFromPrompt(prompt: string) {
  const trimmedPrompt = prompt.trim();
  return runJsonAction({
    noteId: null,
    action: "create-note-from-prompt",
    systemPrompt: buildAiSystemPrompt("create-note-from-prompt"),
    inputForAudit: trimmedPrompt,
    promptToModel: buildAiUserPrompt("create-note-from-prompt", {
      prompt: trimmedPrompt,
    }),
    parse: createSchemaParser(QuickCaptureNoteSchema),
  });
}
