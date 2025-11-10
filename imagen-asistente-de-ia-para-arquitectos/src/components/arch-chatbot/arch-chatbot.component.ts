import { Component, ChangeDetectionStrategy, signal, inject, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, ChatHistory } from '../../services/gemini.service';
import { Chat } from '@google/genai';

interface Message {
  role: 'user' | 'model';
  text: string;
}

@Component({
  selector: 'app-arch-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './arch-chatbot.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchChatbotComponent implements AfterViewInit {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  
  private readonly geminiService = inject(GeminiService);
  private chatSession!: Chat;

  messages = signal<Message[]>([
    { role: 'model', text: "¡Hola! Soy Arqui-IA. ¿Cómo puedo ayudarte con tus preguntas de arquitectura hoy? No dudes en preguntar sobre códigos de construcción, principios de diseño, ciencia de materiales o cualquier otra cosa." }
  ]);
  currentMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  constructor() {
    this.chatSession = this.geminiService.createChatSession();
  }

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  async sendMessage() {
    const userMessage = this.currentMessage().trim();
    if (!userMessage || this.isLoading()) {
      return;
    }

    // Add user message to chat
    this.messages.update(m => [...m, { role: 'user', text: userMessage }]);
    this.currentMessage.set('');
    this.isLoading.set(true);
    this.scrollToBottom();

    try {
      // Add a placeholder for the model's response (opcional, pero se ve bien)
      this.messages.update(m => [...m, { role: 'model', text: '...' }]);
      this.scrollToBottom();

      // ¡CAMBIO IMPORTANTE!
      // Reemplazamos sendMessageStream por sendMessage
      const result = await this.chatSession.sendMessage({ message: userMessage });
      
      this.messages.update(m => {
        // Reemplazamos el placeholder "..." con la respuesta real
        m[m.length - 1].text = result.text;
        return [...m];
      });

    } catch (error) {
      console.error('Chat error:', error);
      this.messages.update(m => {
          const lastMessage = m[m.length - 1];
          lastMessage.text = 'Lo siento, encontré un error. Por favor, inténtalo de nuevo.';
          return [...m];
        });
    } finally {
      this.isLoading.set(false);
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
        try {
            this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
        } catch(err) { }
    }, 10);
  }
}