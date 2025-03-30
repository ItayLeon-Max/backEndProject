import { OpenAIService } from "./HuggingFaceService";

export default class AIService {
  static async getResponse(prompt: string): Promise<string> {
    return OpenAIService.getResponse(prompt);
  }
}