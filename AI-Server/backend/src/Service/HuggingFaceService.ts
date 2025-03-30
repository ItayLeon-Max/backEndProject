import OpenAI from "openai";

const openAiAPIKey = process.env.OPENAI_API_KEY;
const client = new OpenAI({ apiKey: openAiAPIKey });

export class OpenAIService {
  static async getResponse(prompt: string): Promise<string> {
    const completion = await client.chat.completions.create({
      model: "gpt-3.5-turbo",  // השתמש ב-gpt-3.5-turbo או gpt-4
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return completion.choices[0]?.message?.content || "No response";
  }
}