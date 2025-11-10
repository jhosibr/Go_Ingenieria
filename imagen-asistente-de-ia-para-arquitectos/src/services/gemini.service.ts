import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse, Chat, Type, GenerateVideosOperationResponse } from '@google/genai';

// Define a type for the chat history to be more explicit
export type ChatHistory = { role: 'user' | 'model'; parts: { text: string }[] }[];

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // IMPORTANT: The API key is sourced from environment variables.
    // Do not expose this in the client-side code in a real production app.
    // This is a requirement of the Applet environment.
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeBlueprint(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
    try {
      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      };
      const textPart = { text: prompt };

      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
          temperature: 0.3,
          topP: 0.9,
        }
      });

      return response.text;
    } catch (error) {
      console.error('Error analyzing blueprint:', error);
      return 'Ocurrió un error al analizar el plano. Por favor, revisa la consola para más detalles.';
    }
  }

  async analyzeMultiPageBlueprint(prompt: string, images: { base64: string; mimeType: string }[]): Promise<string> {
    try {
      const textPart = { text: prompt };
      const imageParts = images.map(image => ({
        inlineData: {
          mimeType: image.mimeType,
          data: image.base64,
        },
      }));

      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, ...imageParts] },
        config: {
          temperature: 0.3,
          topP: 0.9,
        }
      });

      return response.text;
    } catch (error) {
      console.error('Error analyzing multi-page blueprint:', error);
      return 'Ocurrió un error al analizar el plano de varias páginas. Por favor, revisa la consola para más detalles.';
    }
  }

  createChatSession(history: ChatHistory = []): Chat {
    return this.ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: 'Eres Arqui-IA, un asistente experto para arquitectos e ingenieros civiles con un enfoque primordial en la seguridad y el cumplimiento normativo. Tus respuestas deben ser precisas, cautelosas y basadas en estándares profesionales rigurosos. Prioriza siempre la seguridad estructural y la viabilidad a largo plazo sobre cualquier otra consideración. Recuerda siempre al usuario que tus consejos son una guía y deben ser verificados por un profesional certificado. Usa markdown para dar formato cuando sea apropiado.',
        },
        history: history
    });
  }

  async generateConceptImage(prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: `renderizado arquitectónico profesional de: ${prompt}`,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '16:9',
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
      }
      return '';
    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error('No se pudo generar la imagen. Por favor, inténtalo de nuevo.');
    }
  }
}