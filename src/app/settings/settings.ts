import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OllamaService } from '../chatbot/ollama';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  protected readonly ollama = inject(OllamaService);
  protected readonly busy = signal(false);
  /** Set after a manual attempt that found nothing, so the page can explain what it tried. */
  protected readonly triedHosts = signal<readonly string[]>([]);

  protected readonly form = inject(NonNullableFormBuilder).group({
    baseUrl: [this.ollama.baseUrl(), [Validators.required]],
    model: [{ value: this.ollama.selectedModel(), disabled: true }, [Validators.required]],
  });

  constructor() {
    this.form.controls.model.valueChanges.pipe(takeUntilDestroyed()).subscribe((model) => {
      this.ollama.selectedModel.set(model);
    });

    // Startup discovery may still be running, or may have already moved to another host.
    void this.run(() => this.ollama.ensureConnected());
  }

  /** Connects to the URL in the form. */
  protected connect(): void {
    const control = this.form.controls.baseUrl;
    if (control.invalid) {
      control.markAsTouched();
      return;
    }
    void this.run(() => this.ollama.connectTo(control.value));
  }

  /** Re-scans every known host — the button to press after moving to another machine. */
  protected detect(): void {
    void this.run(() => this.ollama.discover());
  }

  private async run(attempt: () => Promise<boolean>): Promise<void> {
    this.busy.set(true);
    this.triedHosts.set([]);
    const connected = await attempt();
    this.busy.set(false);

    // Show whatever host we ended up on, and the model list that came with it.
    this.form.controls.baseUrl.setValue(this.ollama.baseUrl());
    this.syncModelControl();
    if (!connected) this.triedHosts.set(this.ollama.candidates());
  }

  private syncModelControl(): void {
    const control = this.form.controls.model;
    if (this.ollama.models().length) {
      control.enable({ emitEvent: false });
      control.setValue(this.ollama.selectedModel(), { emitEvent: false });
    } else {
      control.disable({ emitEvent: false });
    }
  }
}
