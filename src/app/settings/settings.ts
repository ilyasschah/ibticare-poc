import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OllamaService } from '../chatbot/ollama';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {
  public ollama = inject(OllamaService);
  
  public url: string = '';
  public isConnected: boolean | null = null;
  public models: string[] = [];
  public selectedModel: string = '';

  ngOnInit() {
    this.url = this.ollama.baseUrl;
    this.selectedModel = this.ollama.selectedModel;
    this.testConnection();
  }

  async testConnection() {
    this.ollama.baseUrl = this.url;
    this.isConnected = await this.ollama.ping();
    if (this.isConnected) {
      this.models = await this.ollama.getModels();
      if (this.models.length > 0 && !this.models.includes(this.selectedModel)) {
        this.selectedModel = this.models[0];
        this.ollama.selectedModel = this.selectedModel;
      }
    } else {
      this.models = [];
    }
  }

  onModelChange(newModel: string) {
    this.selectedModel = newModel;
    this.ollama.selectedModel = newModel;
  }
}