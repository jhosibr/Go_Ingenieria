import { Injectable } from '@angular/core';
import { Chat } from '@google/genai';

// Define a type for the chat history to be more explicit
export type ChatHistory = { role: 'user' | 'model'; parts: { text: string }[] }[];

// Helper para manejar las peticiones a nuestra nueva API
async function fetchProxy(endpoint: string, body: any) {
  // Usamos una ruta relativa. El servidor (Hestia) redirigirá /api/... a nuestro proxy
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Error en la petición al proxy');
  }
  return response.json();
}


@Injectable({ providedIn: 'root' })
export class GeminiService {
  
  // ¡El constructor fue removido! La API Key ya no está aquí.

  async analyzeBlueprint(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
    try {
      // Llama a nuestro nuevo endpoint en el servidor
      const result = await fetchProxy('/api/analyze', { prompt, imageBase64, mimeType });
      return result.text;
    } catch (error) {
      console.error('Error analyzing blueprint:', error);
      return 'Ocurrió un error al analizar el plano. Por favor, revisa la consola para más detalles.';
    }
  }

  // --- INICIO DE LA CORRECCIÓN ---
  // Esta función no estaba implementada en el proxy, así que solo devolvemos el mensaje.
  async analyzeMultiPageBlueprint(prompt: string, images: { base64: string; mimeType: string }[]): Promise<string> {
    console.error('Error: analyzeMultiPageBlueprint no está implementado en el proxy.');
    return 'Aún no se ha implementado el análisis de múltiples páginas en el proxy.';
  }
  // --- FIN DE LA CORRECCIÓN ---

  // Esta clase es solo una definición de tipo, la lógica real está en el backend
  createChatSession(history: ChatHistory = []): Chat {
    // Devolvemos un objeto "falso" que simula la interfaz de Chat
    // para la función sendMessage.
    return {
      history: history,
      async sendMessage(request) {
        const message = (typeof request === 'string') ? request : request.message;
        
        // Llama a nuestro nuevo endpoint de chat
        const result = await fetchProxy('/api/chat', { 
            history: this.history, 
            message: message 
        });
        
        // Actualizamos el historial simulado
        this.history.push({ role: 'user', parts: [{ text: message }] });
        this.history.push({ role: 'model', parts: [{ text: result.text }] });

        return { text: result.text };
      },
      // Dejamos este método vacío ya que no usamos streaming
      async sendMessageStream(request) {
        throw new Error('Streaming no está implementado en este proxy simple.');
      }
    } as unknown as Chat; // Usamos "as" para forzar el tipo
  }


  async generateConceptImage(prompt: string): Promise<string> {
    try {
      // Llama a nuestro nuevo endpoint de generación de imagen
      const result = await fetchProxy('/api/generate', { prompt });
      return result.imageUrl;
    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error('No se pudo generar la imagen. Por favor, inténtalo de nuevo.');
    }
  }
}