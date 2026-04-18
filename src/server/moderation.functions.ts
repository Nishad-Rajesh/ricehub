import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { findBadWord } from "@/lib/profanity";

const inputSchema = z.object({
  text: z.string().min(1).max(10000),
});

type ModerationResult = {
  ok: boolean;
  reason: string | null;
};

async function aiModerate(text: string): Promise<ModerationResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    // No AI available — fail open (wordlist already passed).
    return { ok: true, reason: null };
  }

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You are a content moderator for a Linux ricing community site. Reject content containing: hate speech, slurs, sexual content, harassment, threats, or doxxing. Allow profanity used casually (like 'this looks fucking awesome'), tech jargon, and normal criticism. Respond with JSON only.",
          },
          {
            role: "user",
            content: `Moderate this text:\n\n"""${text.slice(0, 4000)}"""\n\nRespond with JSON: {"safe": boolean, "reason": string|null}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) return { ok: false, reason: "Moderation service is busy. Please try again." };
    if (res.status === 402) return { ok: true, reason: null }; // out of credits — fail open
    if (!res.ok) {
      console.error("AI moderation error", res.status, await res.text());
      return { ok: true, reason: null };
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { safe?: boolean; reason?: string | null };
    if (parsed.safe === false) {
      return { ok: false, reason: parsed.reason || "Content flagged as inappropriate." };
    }
    return { ok: true, reason: null };
  } catch (err) {
    console.error("AI moderation failed:", err);
    return { ok: true, reason: null };
  }
}

export const moderateContent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ModerationResult> => {
    const bad = findBadWord(data.text);
    if (bad) {
      return { ok: false, reason: `Contains disallowed language ("${bad}").` };
    }
    return aiModerate(data.text);
  });
