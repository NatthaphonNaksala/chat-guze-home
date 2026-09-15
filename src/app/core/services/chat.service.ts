import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ForexData {
  pair: string;
  price: number | string;
  leverage?: string;
  spread?: string;
  type?: string;
}

export interface ChatMessage {
  _id?: string;
  sender: 'user' | 'bot';
  text: string;
  imageUrls?: string[];
  timestamp?: Date | string;
  isForexWidget?: boolean; 
  forexData?: ForexData; 
}

export interface ChatSessionData {
  _id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api/chat';

  createSession(): Observable<ChatSessionData> {
    return this.http.post<ChatSessionData>(`${this.baseUrl}/session`, {});
  }

  // 2. ดึงรายการ Session ทั้งหมด
  getSessions(): Observable<ChatSessionData[]> {
    return this.http.get<ChatSessionData[]>(`${this.baseUrl}/sessions`);
  }

  // 3. ดึงข้อความเก่าใน Session
  getMessagesBySession(sessionId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/sessions/${sessionId}/messages`);
  }

  // 4. ส่งข้อความพร้อม sessionId
  sendMessage(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/send`, formData);
  }

  // 5.เปลี่ยนชื่อห้องแชท
  updateSessionTitle(sessionId: string, title: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/sessions/${sessionId}`, { title });
  }

    // 6.ลบห้องแชท
  deleteSession(sessionId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/sessions/${sessionId}`);
  }
  
}