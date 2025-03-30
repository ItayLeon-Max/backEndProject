import { Request, Response, NextFunction } from "express";
import AIRequest from "../../models/AIRequest";
import AIService from "../../Service/AIService";

const MAX_RESPONSE_LENGTH = 1000;
export async function createAIRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { prompt } = req.body;
  
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
        return res.status(400).json({ error: "Invalid prompt. Prompt must be at least 3 characters long." });
      }
  
      console.log(`Received prompt: ${prompt}`);
      const responseText = await AIService.getResponse(prompt);
  
      if (!responseText || responseText.trim().length === 0) {
        return res.status(500).json({ error: "Failed to generate a response from AI" });
      }

      const trimmedResponse = responseText.length > MAX_RESPONSE_LENGTH 
        ? responseText.substring(0, MAX_RESPONSE_LENGTH) + "..."
        : responseText;
  
      console.log("AI Response (trimmed if needed):", trimmedResponse);
  
      const aiRequest = await AIRequest.create({ prompt, response: trimmedResponse });
  
      return res.status(201).json(aiRequest);
    } catch (error: any) {
      console.error("Error in createAIRequest:", error);
      if (error.response) {
        return res.status(error.response.status).json({ error: error.response.data });
      }
      return res.status(500).json({ error: "An unexpected error occurred" });
    }
  }

  export async function getAllAIRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const aiRequests = await AIRequest.findAll();
      if (aiRequests.length === 0) {
        return res.status(404).json({ message: "No AI Requests found" });
      }
      return res.status(200).json(aiRequests);
    } catch (error) {
      console.error("Error in getAllAIRequests:", error);
      next(error);
    }
  }