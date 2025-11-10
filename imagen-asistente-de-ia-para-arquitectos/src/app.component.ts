
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlueprintAnalyzerComponent } from './components/blueprint-analyzer/blueprint-analyzer.component';
import { ArchChatbotComponent } from './components/arch-chatbot/arch-chatbot.component';
import { ConceptGeneratorComponent } from './components/concept-generator/concept-generator.component';

type ActiveTab = 'analyzer' | 'chat' | 'generator';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    BlueprintAnalyzerComponent,
    ArchChatbotComponent,
    ConceptGeneratorComponent,
  ],
})
export class AppComponent {
  activeTab = signal<ActiveTab>('analyzer');

  setActiveTab(tab: ActiveTab) {
    this.activeTab.set(tab);
  }
}
