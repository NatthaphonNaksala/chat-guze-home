import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatWidget } from "../chat-widget/chat-widget";

@Component({
  selector: 'app-home',
  imports: [FormsModule, ChatWidget],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  
}
