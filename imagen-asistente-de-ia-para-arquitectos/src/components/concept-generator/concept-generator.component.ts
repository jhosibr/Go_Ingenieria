import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';

@Component({
  selector: 'app-concept-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './concept-generator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConceptGeneratorComponent {
  private readonly geminiService = inject(GeminiService);

  prompt = signal<string>('Una villa moderna y minimalista en las colinas de Hollywood, con una piscina infinita con vistas a la ciudad.');
  generatedImage = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  async generateImage() {
    if (!this.prompt() || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.generatedImage.set(null);

    try {
      const imageUrl = await this.geminiService.generateConceptImage(this.prompt());
      if (imageUrl) {
        this.generatedImage.set(imageUrl);
      } else {
        this.error.set('El modelo no devolvió una imagen. Por favor, intenta con una instrucción diferente.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      this.error.set(`La generación de la imagen falló: ${errorMessage}`);
    } finally {
      this.isLoading.set(false);
    }
  }
}