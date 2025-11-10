import { Component, ChangeDetectionStrategy, signal, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.mjs';

// Tell TypeScript about the globals from the script tags in index.html
declare const jspdf: any;
declare const html2canvas: any;

interface ImageFile {
  type: 'image';
  base64: string;
  mimeType: string;
  name: string;
}

interface PdfFile {
  type: 'pdf';
  file: File;
  name: string;
  pageCount: number;
  pageThumbnails: string[];
}

type UploadedFile = ImageFile | PdfFile;

@Component({
  selector: 'app-blueprint-analyzer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blueprint-analyzer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlueprintAnalyzerComponent {
  private readonly geminiService = inject(GeminiService);
  @ViewChild('analysisResultContainer') private analysisResultContainer!: ElementRef;

  uploadedFile = signal<UploadedFile | null>(null);
  selectedPdfPage = signal<{ pageNumber: number; base64: string; dataUrl: string; } | null>(null);
  analysisPrompt = signal<string>('Actúa como un ingeniero estructural y arquitecto senior extremadamente riguroso y con aversión al riesgo. Tu principal prioridad es la seguridad, el cumplimiento de los códigos de construcción más estrictos y la viabilidad a largo plazo del proyecto. No hagas suposiciones optimistas. Señala cada posible problema, por pequeño que parezca. Analiza el plano proporcionado y estructura tu respuesta en las siguientes secciones usando formato Markdown:\n\n### 1. Análisis Estructural y de Seguridad (Prioridad Máxima)\n- Evalúa la integridad de los elementos de carga, vanos, cimientos y conexiones estructurales.\n- Identifica posibles puntos de fallo, concentraciones de estrés o debilidades de diseño.\n- Analiza las medidas de seguridad contra incendios, rutas de evacuación y resistencia sísmica según los estándares generales.\n\n### 2. Cumplimiento Normativo y de Códigos\n- Realiza una revisión preliminar basada en estándares internacionales comunes (ej. IBC, ADA). Menciona explícitamente que los códigos locales deben ser verificados.\n- Señala cualquier desviación potencial en accesibilidad, ventilación, iluminación y ratios de ocupación.\n\n### 3. Materiales, Durabilidad y Mantenimiento\n- Recomienda materiales basándote en su durabilidad, resistencia, longevidad y requisitos de mantenimiento. Considera las condiciones ambientales.\n- Advierte sobre materiales o técnicas de construcción que puedan presentar riesgos a largo plazo.\n\n### 4. Resumen de Riesgos Críticos\n- Enumera en una lista los 3-5 riesgos más críticos identificados que requieren atención inmediata por parte de un profesional.\n\n---\n\n**NOTA IMPORTANTE:** Este análisis es generado por IA y debe ser considerado únicamente como una herramienta de apoyo preliminar. NO REEMPLAZA la revisión, juicio y aprobación de un ingeniero o arquitecto humano certificado. Todas las observaciones y recomendaciones deben ser verificadas de forma independiente por un profesional cualificado antes de su implementación.');
  analysisResult = signal<string>('');
  isLoading = signal<boolean>(false);
  isProcessingPdf = signal<boolean>(false);
  error = signal<string | null>(null);
  isDragOver = signal<boolean>(false);
  analyzingMode = signal<'page' | 'all' | null>(null);

  constructor() {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.mjs';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const element = event.target as HTMLInputElement;
    const files = element.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  private async handleFile(file: File) {
    this.removeFile();
    this.error.set(null);

    if (file.type.startsWith('image/')) {
      this.handleImageFile(file);
    } else if (file.type === 'application/pdf') {
      await this.handlePdfFile(file);
    } else {
      this.error.set('Tipo de archivo no válido. Por favor, sube una imagen (PNG, JPEG, WEBP) o un PDF.');
    }
  }

  private handleImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const base64String = e.target.result.split(',')[1];
      this.uploadedFile.set({
        type: 'image',
        base64: base64String,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  }

  private async handlePdfFile(file: File) {
    this.isProcessingPdf.set(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      const pdf = await pdfjsLib.getDocument(typedArray).promise;
      const pageCount = pdf.numPages;
      const thumbnails: string[] = [];

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        if (context) {
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          thumbnails.push(canvas.toDataURL('image/jpeg'));
        }
      }
      this.uploadedFile.set({ type: 'pdf', file, name: file.name, pageCount, pageThumbnails: thumbnails });
    } catch (err) {
      console.error(err);
      this.error.set('No se pudo procesar el archivo PDF. Puede que esté dañado o en un formato no compatible.');
    } finally {
      this.isProcessingPdf.set(false);
    }
  }

  async selectPdfPage(pageNumber: number) {
    this.selectedPdfPage.set(null);
    const currentFile = this.uploadedFile();
    if (!currentFile || currentFile.type !== 'pdf') return;

    this.isProcessingPdf.set(true);
    try {
      const arrayBuffer = await currentFile.file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      const pdf = await pdfjsLib.getDocument(typedArray).promise;
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2.0 }); // Higher quality for preview
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if(context) {
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg');
        const base64 = dataUrl.split(',')[1];
        this.selectedPdfPage.set({ pageNumber, base64, dataUrl });
      }
    } catch (err) {
       console.error(err);
       this.error.set(`No se pudo renderizar la página ${pageNumber}.`);
    } finally {
       this.isProcessingPdf.set(false);
    }
  }

  removeFile() {
    this.uploadedFile.set(null);
    this.selectedPdfPage.set(null);
    this.analysisResult.set('');
    this.error.set(null);
  }

  async analyzeBlueprint(analyzeAll: boolean = false) {
    const currentFile = this.uploadedFile();
    const prompt = this.analysisPrompt();

    if (!currentFile || !prompt) {
      this.error.set('Por favor, sube un archivo y proporciona una instrucción de análisis.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.analysisResult.set('');

    try {
      if (analyzeAll && currentFile.type === 'pdf') {
        this.analyzingMode.set('all');
        this.isProcessingPdf.set(true);
        
        const images: { base64: string; mimeType: string }[] = [];
        const arrayBuffer = await currentFile.file.arrayBuffer();
        const typedArray = new Uint8Array(arrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if(context) {
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                const dataUrl = canvas.toDataURL('image/jpeg');
                const base64 = dataUrl.split(',')[1];
                images.push({ base64, mimeType: 'image/jpeg' });
            }
        }
        
        this.isProcessingPdf.set(false);

        const multiPagePrompt = `Vas a recibir varias páginas de un plano arquitectónico. Analiza cada página individualmente y proporciona un informe consolidado. Estructura tu respuesta con un encabezado principal para cada página (ej. '### Análisis de la Página 1'). Luego, para cada página, sigue las siguientes instrucciones del usuario:\n\n---\n\n${prompt}`;
        
        const result = await this.geminiService.analyzeMultiPageBlueprint(multiPagePrompt, images);
        this.analysisResult.set(result);

      } else {
        this.analyzingMode.set('page');
        let imageForAnalysis: { base64: string; mimeType: string } | null = null;

        if (currentFile?.type === 'image') {
          imageForAnalysis = { base64: currentFile.base64, mimeType: currentFile.mimeType };
        } else if (currentFile?.type === 'pdf' && this.selectedPdfPage()) {
          imageForAnalysis = { base64: this.selectedPdfPage()!.base64, mimeType: 'image/jpeg' };
        }

        if (!imageForAnalysis) {
          if (currentFile?.type === 'pdf') {
            this.error.set('Para el análisis de una sola página, por favor selecciona una página del PDF.');
          } else {
            this.error.set('Por favor, sube un archivo y proporciona una instrucción de análisis.');
          }
          this.isLoading.set(false);
          this.analyzingMode.set(null);
          return;
        }

        const result = await this.geminiService.analyzeBlueprint(prompt, imageForAnalysis.base64, imageForAnalysis.mimeType);
        this.analysisResult.set(result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
      this.error.set(`El análisis falló: ${errorMessage}`);
    } finally {
      this.isLoading.set(false);
      this.isProcessingPdf.set(false);
      this.analyzingMode.set(null);
    }
  }


  async downloadPdf() {
    if (!this.analysisResult() || !this.analysisResultContainer) return;
    
    const { jsPDF } = jspdf;
    const content = this.analysisResultContainer.nativeElement;
    this.isLoading.set(true);

    try {
        const canvas = await html2canvas(content, { 
            scale: 2, 
            backgroundColor: '#1f2937', // bg-gray-800
            useCORS: true 
        });
        const imgData = canvas.toDataURL('image/png');
        
        // A4 dimensions in points: 595.28 x 841.89
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const width = pdfWidth - 40; // with margin
        const height = width / ratio;

        pdf.addImage(imgData, 'PNG', 20, 20, width, height);
        
        const fileName = (this.uploadedFile()?.name.split('.')[0] || 'analisis') + '.pdf';
        pdf.save(`Analisis-IA-${fileName}`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        this.error.set("No se pudo generar el PDF del análisis.");
    } finally {
        this.isLoading.set(false);
    }
  }
}