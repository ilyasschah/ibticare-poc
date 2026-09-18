import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Chatbot } from './chatbot/chatbot';
import { SideNav } from './side-nav/side-nav';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Chatbot, SideNav],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
