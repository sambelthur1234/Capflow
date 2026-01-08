
import { GoogleGenAI, Type } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async suggestStyle(frameBase64: string) {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: frameBase64.split(',')[1],
              },
            },
            {
              text: "Analyze the mood, color palette, and composition of this video frame. Suggest professional caption styling including: font color (hex), background color (hex, include transparency if needed), font weight (bold/medium/normal), and font size relative to video height (percentage). Return as JSON.",
            }
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              color: { type: Type.STRING },
              backgroundColor: { type: Type.STRING },
              fontWeight: { type: Type.STRING },
              fontSize: { type: Type.NUMBER },
              fontFamily: { type: Type.STRING },
              verticalOffset: { type: Type.NUMBER },
            },
            required: ["color", "backgroundColor", "fontWeight", "fontSize", "fontFamily"]
          }
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error("Gemini suggestStyle error:", error);
      return null;
    }
  }

  async translateSubtitles(subtitles: string, targetLanguage: string) {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate the following SRT text to ${targetLanguage}. Keep the timing and format exactly the same:\n\n${subtitles}`,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini translate error:", error);
      return subtitles;
    }
  }
}

export const geminiService = new GeminiService();
