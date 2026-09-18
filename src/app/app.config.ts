import { isPlatformBrowser } from '@angular/common';
import {
  ApplicationConfig,
  PLATFORM_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { provideAgent } from './agent/provide-agent';
import { routes } from './app.routes';
import { OllamaService } from './chatbot/ollama';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAgent(),
    provideClientHydration(withEventReplay()),
    provideAppInitializer(() => {
      // Find an Ollama server in the background; bootstrap must not wait on the network.
      if (isPlatformBrowser(inject(PLATFORM_ID))) {
        void inject(OllamaService).ensureConnected();
      }
    }),
  ],
};
