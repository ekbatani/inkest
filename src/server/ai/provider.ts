import OpenAI from "openai";

export type AiProvider = {
  model: string;
  complete: (prompt: string, systemPrompt: string) => Promise<string>;
};

export function getAiProvider(): AiProvider | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const client = new OpenAI({ apiKey, baseURL: baseUrl });

  return {
    model,
    complete: async (prompt: string, systemPrompt: string) => {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      });
      return response.choices[0]?.message?.content ?? "";
    },
  };
}
