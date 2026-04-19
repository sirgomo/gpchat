import { Injectable, signal } from '@angular/core';
import { Observable, BehaviorSubject, of, map } from 'rxjs';
import { iMessageContent, iConversation } from '../models/message';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private STORAGE_KEY = 'gpchat_conversations';
  private currentThreadId = signal<string | null>(null);
  
  private conversations$ = new BehaviorSubject<iConversation[]>([]);
  
  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        this.conversations$.next(JSON.parse(stored));
      } catch {
        this.conversations$.next([]);
      }
    }
  }

  private saveToStorage() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.conversations$.value));
  }

  createConversation(name: string = 'New Chat', systemPrompt?: string): iConversation {
    const conv: iConversation = {
      id: this.generateId(),
      name,
      messages: [],
      systemPrompt: systemPrompt || '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const current = this.conversations$.value;
    this.conversations$.next([conv, ...current]);
    this.saveToStorage();
    return conv;
  }

  getConversations(): Observable<iConversation[]> {
    return this.conversations$.asObservable();
  }

  getConversation(id: string): iConversation | undefined {
    return this.conversations$.value.find(c => c.id === id);
  }

  setCurrentThread(id: string) {
    this.currentThreadId.set(id);
  }

  getCurrentThreadId(): string | null {
    return this.currentThreadId();
  }

  addMessage(conversationId: string, message: iMessageContent) {
    const current = this.conversations$.value;
    const conv = current.find(c => c.id === conversationId);
    if (conv) {
      conv.messages.push(message);
      conv.updatedAt = Date.now();
      this.conversations$.next([...current]);
      this.saveToStorage();
    }
  }

  updateConversation(conversationId: string, messages: iMessageContent[]) {
    const current = this.conversations$.value;
    const conv = current.find(c => c.id === conversationId);
    if (conv) {
      conv.messages = messages;
      conv.updatedAt = Date.now();
      this.conversations$.next([...current]);
      this.saveToStorage();
    }
  }

  deleteConversation(conversationId: string) {
    const current = this.conversations$.value.filter(c => c.id !== conversationId);
    this.conversations$.next(current);
    this.saveToStorage();
  }

  renameConversation(conversationId: string, name: string) {
    const current = this.conversations$.value;
    const conv = current.find(c => c.id === conversationId);
    if (conv) {
      conv.name = name;
      this.conversations$.next([...current]);
      this.saveToStorage();
    }
  }

  setSystemPrompt(conversationId: string, systemPrompt: string) {
    const current = this.conversations$.value;
    const conv = current.find(c => c.id === conversationId);
    if (conv) {
      conv.systemPrompt = systemPrompt;
      this.conversations$.next([...current]);
      this.saveToStorage();
    }
  }

  getSystemPrompt(conversationId: string): string {
    const conv = this.conversations$.value.find(c => c.id === conversationId);
    return conv?.systemPrompt || '';
  }

  clearAll() {
    this.conversations$.next([]);
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem('current_thread_id');
  }

  private generateId(): string {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}