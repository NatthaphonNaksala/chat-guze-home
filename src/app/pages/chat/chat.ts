import { Component, signal, OnInit, OnDestroy, viewChild, ElementRef, effect, inject, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Message } from '../../shared/models/message.model';
import { ForexPair } from '../../shared/models/forex-pair.model';
import { DatePipe } from '@angular/common';
import { ChatMessage, ChatService, ChatSessionData } from '../../core/services/chat.service';
import { NgxDarkVeilComponent } from '@omnedia/ngx-dark-veil';
import { NgxGalaxyComponent } from '@omnedia/ngx-galaxy';
import { NgxWordMorphComponent } from '@omnedia/ngx-word-morph';
// export interface ForexPair {
//   pair: string;
//   price: number;
//   change: number;
//   up: boolean;
// }


@Component({
  selector: 'app-chat',
  imports: [
    DatePipe,
    NgxDarkVeilComponent,
    NgxGalaxyComponent,
    NgxWordMorphComponent,
  ],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat {

  protected readonly title = signal('Chat AI');
  chatContainer = viewChild<ElementRef<HTMLDivElement>>('chatContainer');
  private chatService = inject(ChatService);
  private elementRef = inject(ElementRef);

  // State Signals
  isConnectedDB = signal(true);
  isConnectedForex = signal(true);
  isSidebarOpen = signal(true);

  messages = signal<ChatMessage[]>([]);
  inputText = signal<string>('');
  isLoading = signal<boolean>(false);

  // Sessions & Active Session
  chatSessions = signal<ChatSessionData[]>([]);
  currentSessionId = signal<string | null>(null);
  // ตัวแปรสำหรับเก็บ id และชื่อห้องที่กำลังจะแก้ไขชื่อ
  // Signals สำหรับควบคุม Dropdown และ Modals
  activeMenuId = signal<string | null>(null);
  isRenameModalOpen = signal<boolean>(false);
  isDeleteModalOpen = signal<boolean>(false);
  
  selectedSession = signal<any>(null);
  editingTitle = signal<string>('');

  // 🟢 เพิ่ม Signals สำหรับจัดการไฟล์รูปภาพ
  selectedFiles = signal<File[]>([]);
  selectedImagePreviews = signal<string[]>([]);
  toastMessage = signal<string | null>(null);

  isSplashActive = signal<boolean>(true);
  isSplashHidden = signal<boolean>(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // ตรวจสอบว่าจุดที่คลิก ไม่ใช่ปุ่ม 3 จุด และไม่ใช่พื้นที่ภายในเมนู Dropdown
    const isMenuClick = target.closest('.relative.shrink-0');

    // ถ้าไม่ได้กดที่โซนปุ่ม 3 จุด/เมนู ให้ทำการปิด Dropdown ทันที
    if (!isMenuClick) {
      this.activeMenuId.set(null);
    }
  }

  suggestedPrompts = [
    'ขอทราบอัตราแลกเปลี่ยน GOLD (XAU/USD) ล่าสุด',
    'เลเวอเรจ (Leverage) สูงสุดของบัญชีแต่ละประเภทคือเท่าไหร่?',
    'ฝากเงินขั้นต่ำและช่องทางการถอนเงินมีอะไรบ้าง?',
    'มีโปรโมชั่นโบนัสเงินฝากสำหรับลูกค้าใหม่ไหม?'
  ];

  forexRates = signal<ForexPair[]>([
    { pair: 'EUR/USD', price: 1.0854, change: 0.12, up: true },
    { pair: 'GBP/USD', price: 1.2642, change: -0.08, up: false },
    { pair: 'USD/JPY', price: 154.21, change: 0.35, up: true },
    { pair: 'XAU/USD (Gold)', price: 2384.50, change: 1.45, up: true },
    { pair: 'BTC/USD', price: 61420.00, change: -2.10, up: false }
  ]);

  constructor() {
    effect(() => {
      this.messages();
      this.isLoading();
      this.scrollToBottom();
    });
  }

  ngOnInit(): void {
    this.loadSessions();

    setTimeout(() => {
      this.isSplashActive.set(false);
      
      // 2. รออีก 700ms ให้ CSS transition-opacity เล่นเสร็จ ค่อยซ่อน Element จริง
      setTimeout(() => {
        this.isSplashHidden.set(true);
      }, 700);
    }, 2000);
  }

  // โหลดรายการ Sidebar ทั้งหมด
  loadSessions(): void {
    this.chatService.getSessions().subscribe({
      next: (sessions) => {
        this.chatSessions.set(sessions);
        
        this.currentSessionId.set(null);
        this.messages.set([]);
      },
      error: (err) => console.error('Failed to load sessions:', err)
    });
  }

  // สลับไปดูแชทห้องอื่น
  selectSession(sessionId: string): void {
    this.currentSessionId.set(sessionId);
    this.chatService.getMessagesBySession(sessionId).subscribe({
      next: (msgs) => this.messages.set(msgs),
      error: (err) => console.error('Failed to load session messages:', err)
    });
  }

  // ปุ่ม "+ New Chat"
  createNewChat(): void {
    if (this.messages().length === 0) {
      return;
    }
    this.currentSessionId.set(null);
    this.messages.set([]);
  }

  // ส่งข้อความ
  sendMessage(textOverride?: string): void {
    const text = textOverride || this.inputText().trim();
    const files = this.selectedFiles();

    if ((!text && files.length === 0) || this.isLoading()) return;

    // ดึงรูปพรีวิวรูปแรกไปแสดงบน Bubble แชท (หรือจัดการ Array ตามต้องการ)
    const previewUrl = this.selectedImagePreviews().length > 0 ? this.selectedImagePreviews()[0] : undefined;

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
    
    // เคลียร์รูปภาพทั้งหมดหลังส่ง
    this.clearSelectedImages();
    this.isLoading.set(true);

    if (!this.currentSessionId()) {
      this.chatService.createSession().subscribe({
        next: (newSession) => {
          this.currentSessionId.set(newSession._id);
          this.chatSessions.update((prev) => [newSession, ...prev]);
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

  // 🟢 3. อัปเดต Helper เรียก API ให้แนบหลายไฟล์ลง FormData ('images')
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
          { 
            sender: 'bot', 
            text: res.reply, 
            imageUrls: res.botMessage?.imageUrls || [],
            timestamp: new Date() 
          }
        ]);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error sending message:', err);
        this.isLoading.set(false);
      }
    });
  }

    private refreshSessions(): void {
      this.chatService.getSessions().subscribe({
        next: (sessions) => this.chatSessions.set(sessions)
      });
    }

  // Rename & Delete Session

  // เปิด/ปิด Dropdown เมนู 3 จุด
  toggleMenu(sessionId: string, event: MouseEvent): void {
    event.stopPropagation(); // กันไม่ให้ Event ทะลุไปกดเลือก Session แชท
    
    // สลับเปิด-ปิดเมนู
    if (this.activeMenuId() === sessionId) {
      this.activeMenuId.set(null);
    } else {
      this.activeMenuId.set(sessionId);
    }
  }

    // Rename Dialog
  openRenameModal(session: any, event: Event): void {
    event.stopPropagation();
    this.selectedSession.set(session);
    this.editingTitle.set(session.title);
    this.activeMenuId.set(null);
    this.isRenameModalOpen.set(true);
  }

  closeRenameModal(): void {
    this.isRenameModalOpen.set(false);
    this.selectedSession.set(null);
  }

  saveRenameSession(): void {
    const session = this.selectedSession();
    const title = this.editingTitle().trim();
    if (!session || !title) return;

    this.chatService.updateSessionTitle(session._id, title).subscribe({
      next: () => {
        this.chatSessions.update((sessions) =>
          sessions.map((s) => (s._id === session._id ? { ...s, title } : s))
        );
        this.closeRenameModal();
      },
      error: (err) => console.error('Failed to rename:', err)
    });
  }

  // Delete Dialog
  openDeleteModal(session: any, event: Event): void {
    event.stopPropagation();
    this.selectedSession.set(session);
    this.activeMenuId.set(null);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.selectedSession.set(null);
  }

  confirmDeleteSession(): void {
    const session = this.selectedSession();
    if (!session) return;

    this.chatService.deleteSession(session._id).subscribe({
      next: () => {
        this.chatSessions.update((sessions) =>
          sessions.filter((s) => s._id !== session._id)
        );

        if (this.currentSessionId() === session._id) {
          this.currentSessionId.set(null);
          this.messages.set([]);
        }
        this.closeDeleteModal();
      },
      error: (err) => console.error('Failed to delete:', err)
    });
  }

  // End Rename & Delete Session

  toggleSidebar(): void {
    this.isSidebarOpen.update((v) => !v);
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

  // Picture

  openImage(url?: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); 
      this.sendMessage();
    }
  }

  onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      event.preventDefault(); 
      this.processFiles(imageFiles);
    }
  }

  showToast(message: string): void {
    this.toastMessage.set(message);
    
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }

  // 🟢 ฟังก์ชันสำหรับจัดการไฟล์และแจ้งเตือนเมื่อเกิน 5 รูป
  private processFiles(newFiles: File[]): void {
    const currentFiles = this.selectedFiles();
    const maxAllowed = 5;

    if (currentFiles.length >= maxAllowed) {
      // 🟢 เปลี่ยนจาก alert เป็น showToast
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
      // 🟢 เปลี่ยนจาก alert เป็น showToast
      this.showToast('อัปโหลดได้สูงสุด 5 รูปต่อข้อความ (ระบบแนบเฉพาะ 5 รูปแรกให้)');
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    this.processFiles(files);

    input.value = '';
  }

  addFiles(files: File[]): void {
    this.selectedFiles.update((current: File[]) => [...current, ...files]);

    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedImagePreviews.update((previews: string[]) => [
          ...previews, 
          reader.result as string
        ]);
      };
      reader.readAsDataURL(file);
    });
  }

  removeSelectedImage(index: number): void {
    this.selectedFiles.update((files: File[]) => 
      files.filter((_: File, i: number) => i !== index)
    );
    this.selectedImagePreviews.update((previews: string[]) => 
      previews.filter((_: string, i: number) => i !== index)
    );
  }

  clearSelectedImages(): void {
    this.selectedFiles.set([]);
    this.selectedImagePreviews.set([]);
  }

  // ยกเลิก/ลบรูปภาพที่เลือกไว้
  // removeSelectedImage() {
  //   this.selectedFile.set(null);
  //   this.selectedImagePreview.set(null);
  // }

}
