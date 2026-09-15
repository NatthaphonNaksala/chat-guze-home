import { Component, effect, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { ChatService } from '../../core/services/chat.service';
import { DatePipe } from '@angular/common';
import { FAQ_CATEGORIES } from '../../shared/constants/faq-categories.constant';
import { NgxDarkVeilComponent } from '@omnedia/ngx-dark-veil';

export interface FaqCategory {
  id: string;
  title: string;
  questions: string[];
}

@Component({
  selector: 'app-chat-widget',
  imports: [
    DatePipe,
    NgxDarkVeilComponent,
  ],
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.css',
})
export class ChatWidget {

  isOpen = signal<boolean>(false);
  
  toggleChat(): void {
    this.isOpen.update((prev) => !prev);
  }

  categories: FaqCategory[] = FAQ_CATEGORIES;

  selectQuestion = output<string>();

  // State บันทึกหมวดหมู่ที่กำลังเลือกอยู่
  selectedCategory = signal<FaqCategory | null>(null);

  // 🟢 เพิ่ม State สำหรับดักจับการ Hover หมวดหมู่
  hoveredCategory = signal<FaqCategory | null>(null);

  // --- Chat & Image Core States ---
  chatContainer = viewChild<ElementRef<HTMLDivElement>>('chatContainer');
  private chatService = inject(ChatService);

  messages = signal<any[]>([]);
  inputText = signal<string>('');
  isLoading = signal<boolean>(false);
  currentSessionId = signal<string | null>(null);

  // Signals สำหรับจัดการรูปภาพและแจ้งเตือน
  selectedFiles = signal<File[]>([]);
  selectedImagePreviews = signal<string[]>([]);
  toastMessage = signal<string | null>(null);

  constructor() {
    // เลื่อน scrollbar ลงล่างสุดอัตโนมัติเมื่อมีข้อความใหม่
    effect(() => {
      this.messages();
      this.isLoading();
      this.scrollToBottom();
    });
  }

  chooseCategory(category: FaqCategory) {
    this.selectedCategory.set(category);
  }

  backToCategories() {
    this.selectedCategory.set(null);
  }

  onSelectQuestion(question: string): void {
    this.sendMessage(question);
  }

  // --- ระบบส่งข้อความ ---
  sendMessage(textOverride?: string): void {
    const text = textOverride || this.inputText().trim();
    const files = this.selectedFiles();

    if ((!text && files.length === 0) || this.isLoading()) return;

    // 🟢 ซ่อนเมนูคำถามย่อยทันทีที่เริ่มส่งข้อความ
    this.selectedCategory.set(null);

    // เพิ่มข้อความฝั่ง User เข้า UI ทันที
    this.messages.update((prev) => [
      ...prev,
      {
        sender: 'user',
        text,
        imageUrls: [...this.selectedImagePreviews()],
        timestamp: new Date()
      }
    ]);

    if (!textOverride) {
      this.inputText.set('');
    }

    this.clearSelectedImages();
    this.isLoading.set(true);

    // หากยังไม่มี Session ให้สร้างก่อนส่ง หรือส่งตรงไปยัง API
    if (!this.currentSessionId()) {
      this.chatService.createSession().subscribe({
        next: (newSession) => {
          this.currentSessionId.set(newSession._id);
          this.executeSendMessage(text, files, newSession._id);
        },
        error: (err) => {
          console.error('Failed to create session on first message:', err);
          this.isLoading.set(false);
        }
      });
    } else {
      this.executeSendMessage(text, files, this.currentSessionId()!);
    }
  }

  private executeSendMessage(text: string, files: File[], sessionId: string): void {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('message', text);

    files.forEach((file: File) => {
      formData.append('images', file);
    });

    this.chatService.sendMessage(formData).subscribe({
      next: (res) => {
        this.messages.update((prev) => [
          ...prev,
          { sender: 'bot', text: res.reply, timestamp: new Date() }
        ]);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error sending message:', err);
        this.isLoading.set(false);
      }
    });
  }

  // --- ระบบจัดการรูปภาพและ Paste ---
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    this.processFiles(files);
    input.value = '';
  }

  onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      event.preventDefault();
      this.processFiles(imageFiles);
    }
  }

  private processFiles(newFiles: File[]): void {
    const currentFiles = this.selectedFiles();
    const maxAllowed = 5;

    if (currentFiles.length >= maxAllowed) {
      this.showToast('อัปโหลดได้สูงสุด 5 รูปต่อข้อความเท่านั้น');
      return;
    }

    let showWarning = false;
    let filesToAdd = newFiles;

    if (currentFiles.length + newFiles.length > maxAllowed) {
      const availableSlots = maxAllowed - currentFiles.length;
      filesToAdd = newFiles.slice(0, availableSlots);
      showWarning = true;
    }

    filesToAdd.forEach((file) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const previewUrl = e.target?.result as string;
        this.selectedFiles.update((prev) => [...prev, file]);
        this.selectedImagePreviews.update((prev) => [...prev, previewUrl]);
      };
      reader.readAsDataURL(file);
    });

    if (showWarning) {
      this.showToast('อัปโหลดได้สูงสุด 5 รูปต่อข้อความ (ระบบแนบเฉพาะ 5 รูปแรกให้)');
    }
  }

  removeSelectedImage(index: number): void {
    this.selectedFiles.update((files) => files.filter((_, i) => i !== index));
    this.selectedImagePreviews.update((previews) => previews.filter((_, i) => i !== index));
  }

  clearSelectedImages(): void {
    this.selectedFiles.set([]);
    this.selectedImagePreviews.set([]);
  }

  openImage(url?: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  // --- ระบบแจ้งเตือน (Toast) และ Helpers ---
  showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      const el = this.chatContainer()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
        const lastChild = el.lastElementChild;
        if (lastChild) {
          lastChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }
    });
  }

}
