import { ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { Observable, Subscription, take, tap } from 'rxjs';
import { iMessageStatus } from '../models/messStatus';
import { iMessage, iMessageContent, iConversation } from '../models/message';
import { GpService } from '../services/gpservice';
import { HistoryService } from '../services/history.service';
import { QdrantService } from '../services/qdrant.service';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { environment } from '../../environment/environment';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('stream', { static: true }) private streamElement!: ElementRef<HTMLDivElement>;
  @ViewChild('autosize') autosize!: CdkTextareaAutosize;
  
  private service = inject(GpService);
  private historyService = inject(HistoryService);
  private qdrantService = inject(QdrantService);
  private _ngZone = inject(NgZone);
  
  title = 'gpchat';
  model$ = this.service.getMoodel();
  response$ = new Observable<iMessageStatus[]>();
  conversations$: Observable<iConversation[]>;
  currentConversation: iConversation | null = null;
  
  data = '';
  selectedModel = environment.default_model || 'gpt-4.1-mini';
  systemRole = '';
  selectedFiles: File[] = [];
  imageUrls: string[] = [];
  useMemory = environment.use_memory;
  flexMode = false;
  isDragging = false;
  showSystemPrompt = false;
  des$ = new Subscription();
  loged = this.service.getlogeg();
  
  constructor() {
    this.conversations$ = this.historyService.getConversations();
  }

  ngOnInit() {
    const savedThread = localStorage.getItem('current_thread_id');
    if (savedThread) {
      this.loadConversation(savedThread);
    }
    this.systemRole = this.service.getSystemPrompt() || environment.system_prompt;
  }

  ngOnDestroy(): void {
    this.des$.unsubscribe();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(Array.from(files));
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
  }

  async handleFiles(files: File[]) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    for (const file of imageFiles.slice(0, 10)) {
      this.selectedFiles.push(file);
      const url = await this.fileToUrl(file);
      this.imageUrls.push(url);
    }
  }

  fileToUrl(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }

  removeImage(index: number) {
    this.imageUrls.splice(index, 1);
    this.selectedFiles.splice(index, 1);
  }

  saveSystemPrompt() {
    if (this.systemRole.trim()) {
      this.service.setSystemPrompt(this.systemRole.trim());
      if (this.currentConversation) {
        this.historyService.setSystemPrompt(this.currentConversation.id, this.systemRole.trim());
      }
    }
    this.showSystemPrompt = false;
  }

  toggleSystemPrompt() {
    if (this.currentConversation) {
      const saved = this.historyService.getSystemPrompt(this.currentConversation.id);
      this.systemRole = saved || environment.system_prompt;
    } else {
      this.systemRole = environment.system_prompt;
    }
    this.showSystemPrompt = !this.showSystemPrompt;
  }

  async sendImageOnly(index: number) {
    const imageUrl = this.imageUrls[index];
    if (!imageUrl && !this.selectedFiles[index]) return;

    if (!this.currentConversation) {
      this.currentConversation = this.historyService.createConversation('Image ' + new Date().toLocaleTimeString(), this.systemRole);
      this.service.setThread(this.currentConversation.id);
      localStorage.setItem('current_thread_id', this.currentConversation.id);
    }

    const messages: iMessageContent[] = [];
    
    messages.push({
      role: 'user',
      content: 'Describe this image',
      image_url: { url: imageUrl }
    });

    const mess: iMessage = {
      model: this.selectedModel,
      temperature: 0.5,
      messages,
      max_tokens: null,
      stream: true
    };

    const files = [this.selectedFiles[index]];
    this.service.sendMessage(mess, files).then(obs => {
      this.response$ = obs.pipe(tap(() => this.scrollToBottom()));
    });

    this.imageUrls.splice(index, 1);
    this.selectedFiles.splice(index, 1);
  }

  async sendImagesFlex() {
    for (let i = 0; i < this.imageUrls.length; i++) {
      await this.sendImageOnly(i);
      await new Promise(r => setTimeout(r, 500));
    }
  }

  Verschicken() {
    if (!this.data.trim() && this.selectedFiles.length === 0) return;

    if (this.flexMode && this.selectedFiles.length > 0) {
      this.sendImagesFlex();
      this.data = '';
      return;
    }

    let messages: iMessageContent[] = [];

    if (this.selectedFiles.length > 0) {
      const content = this.data.trim() || 'Describe these images';
      messages.push({
        role: 'user',
        content,
        image_url: this.imageUrls.map(url => ({ url }))
      });
    } else {
      messages.push({ role: 'user', content: this.data });
    }

    if (!this.currentConversation) {
      const name = this.data.slice(0, 30) || 'New Chat';
      this.currentConversation = this.historyService.createConversation(name, this.systemRole);
      this.service.setThread(this.currentConversation.id);
      localStorage.setItem('current_thread_id', this.currentConversation.id);
    }

    const mess: iMessage = {
      model: this.selectedModel,
      temperature: 0.5,
      messages,
      max_tokens: null,
      stream: true
    };

    this.service.sendMessage(mess, this.selectedFiles).then(obs => {
      this.response$ = obs.pipe(tap(() => this.scrollToBottom()));
    });

    this.data = '';
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = this.streamElement?.nativeElement;
      if (el) {
        el.scrollTo({
          top: el.scrollHeight - el.clientHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  }

  chatReset() {
    this.response$ = this.service.resetChat();
    this.systemRole = environment.system_prompt;
    this.data = '';
    this.imageUrls = [];
    this.selectedFiles = [];
    localStorage.removeItem('current_thread_id');
    this.currentConversation = null;
  }

  newChat() {
    this.chatReset();
    this.currentConversation = this.historyService.createConversation('', this.systemRole);
    this.service.setThread(this.currentConversation.id);
    localStorage.setItem('current_thread_id', this.currentConversation.id);
  }

  loadConversation(id: string) {
    const conv = this.historyService.getConversation(id);
    if (conv) {
      this.currentConversation = conv || null;
      this.service.setThread(id);
      this.systemRole = conv.systemPrompt || environment.system_prompt;
      localStorage.setItem('current_thread_id', id);
      const messages = conv?.messages || [];
      this.response$ = new Observable(subscriber => {
        subscriber.next(messages.map((m, i) => ({
          role: m.role,
          content: m.content,
          status: null,
          msgIndex: i
        })));
        subscriber.complete();
      });
    }
  }

  async deleteConversation(id: string, event: Event) {
    event.stopPropagation();
    
    if (confirm('Delete this conversation and all its messages?')) {
      if (this.useMemory || environment.use_memory) {
        await this.qdrantService.deleteConversation(id).toPromise();
      }
      this.historyService.deleteConversation(id);
      if (this.currentConversation?.id === id) {
        this.chatReset();
      }
    }
  }

  renameConversation(id: string, event: Event) {
    event.stopPropagation();
    const conv = this.historyService.getConversation(id);
    if (conv) {
      const newName = prompt('New name:', conv.name);
      if (newName) {
        this.historyService.renameConversation(id, newName);
      }
    }
  }

  clearAllHistory() {
    if (confirm('Delete ALL conversations? This cannot be undone.')) {
      this.historyService.clearAll();
      this.qdrantService.clearAll().subscribe();
      this.chatReset();
    }
  }

  triggerResize() {
    this.des$ = this._ngZone.onStable.pipe(take(1)).subscribe(() => {
      if (this.autosize) {
        this.autosize.resizeToFitContent(true);
      }
    });
  }

  onEnterKey(event: any) {
    if (!event?.shiftKey) {
      event?.preventDefault();
      this.Verschicken();
    }
  }

  getImageUrl(content: any): string | null {
    if (!content.image_url) return null;
    if (Array.isArray(content.image_url)) {
      return content.image_url[0]?.url || null;
    }
    return content.image_url?.url || null;
  }
}