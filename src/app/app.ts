import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { Chatbot } from './chatbot/chatbot'; // <-- Import the Chatbot

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, Chatbot], // <-- Add Chatbot to imports
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  title = 'ibticare-poc';
}