import { HttpClient } from "@angular/common/http";
import { Injectable, signal, inject } from "@angular/core";
import { BehaviorSubject, combineLatest, map, Observable, of } from "rxjs";
import { iGpModels } from "../models/gpModel";
import { iMessage, iMessageContent } from "../models/message";
import { environment } from "../../environment/environment";
import { iMessageStatus } from "../models/messStatus";
import { HistoryService } from "./history.service";

@Injectable({
  providedIn: 'root'
})
export class GpService {
  private http = inject(HttpClient);
  private historyService = inject(HistoryService);
  
  private API_MODELS = 'https://api.openai.com/v1/models';
  private API_RESPONSES = 'https://api.openai.com/v1/responses';
  private API_BILDER = 'https://api.openai.com/v1/images/generations';
  private API_EMBEDDINGS = 'https://api.openai.com/v1/embeddings';
  
  chat: {role: string, content: string}[] = [];
  stream = new BehaviorSubject<iMessageStatus>({role: '', content: '', status: null});
  streamObs$ = this.stream.asObservable();
  #loged = signal(false);
  currentThreadId = signal<string | null>(null);
  defaultModel = environment.default_model || 'gpt-4.1-mini';
  defaultSystemPrompt = environment.system_prompt || 'You are a helpful assistant.';

  constructor() {}

  getMoodel() {
    return this.http.get<iGpModels[]>(this.API_MODELS).pipe(map((res) => {
      const items: Array<any> = Object(res).data.filter((ob: { id: string; }) => 
        ob.id.startsWith('gpt-5.4') //|| ob.id.startsWith('o1-') || ob.id.startsWith('o3-') || ob.id.startsWith('gpt-4o') || ob.id.startsWith('gpt-4.1')
      );
      return items;
    }));
  }

  setLoged() {
    this.#loged.set(true);
  }

  getlogeg() {
    return this.#loged;
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async convertImagesToBase64(files: File[]): Promise<string[]> {
    const base64Images: string[] = [];
    for (const file of files.slice(0, 10)) {
      const base64 = await this.fileToBase64(file);
      const mimeType = file.type || 'image/jpeg';
      base64Images.push(`data:${mimeType};base64,${base64}`);
    }
    return base64Images;
  }

  private buildInputContent(msg: iMessageContent, files?: File[]): any[] {
    const content: any[] = [];
    
    if (msg.image_url) {
      const images = Array.isArray(msg.image_url) ? msg.image_url : [msg.image_url];
      const maxImages = images.slice(0, 10);
      
      for (const img of maxImages) {
        content.push({
          type: 'input_image',
          image_url: img.url
        });
      }
    }
    
    if (files && files.length > 0) {
      this.convertImagesToBase64(files).then(base64Images => {
        for (const b64 of base64Images) {
          content.push({
            type: 'input_image',
            image_url: b64
          });
        }
      });
    }
    
    if (msg.content) {
      content.push({
        type: 'input_text',
        text: msg.content
      });
    }
    
    return content;
  }

  async sendMessage(inMessage: iMessage, files?: File[]) {
    const threadId = this.currentThreadId();
    if (threadId) {
      inMessage.messages.forEach(msg => {
        this.historyService.addMessage(threadId, msg as iMessageContent);
      });
    }

    this.chat = [...this.chat, ...inMessage.messages.map(m => ({ role: m.role, content: m.content }))];
    inMessage.messages = this.chat.map(m => ({ role: m.role as any, content: m.content }));

    const model = inMessage.model || this.defaultModel;
    
    let input: any[] = [];
    
    const threadId2 = this.currentThreadId();
    let systemPrompt = this.defaultSystemPrompt;
    if (threadId2) {
      const conv = this.historyService.getConversation(threadId2);
      if (conv?.systemPrompt) {
        systemPrompt = conv.systemPrompt;
      }
    }
    
    if (systemPrompt) {
      input.push({
        type: 'input_text',
        text: systemPrompt
      });
    }
    
    const userInput = inMessage.messages.map(msg => this.buildInputContent(msg, files)).flat();
    input = [...input, ...userInput];

    if (input.length === 0) {
      input.push({ type: 'input_text', text: inMessage.messages[inMessage.messages.length - 1]?.content || '' });
    }

    this.getStreamResponse({ model, input });

    return this.currentGesprech$ = combineLatest([of(this.chat), this.streamObs$]).pipe(
      map(([chat, res]) => {
        if (res.role === '') {
          return chat.map((item, idx) => ({
            ...item,
            status: res.status,
            msgIndex: idx
          }));
        }

        if (chat[chat.length - 1]?.role === 'assistant') {
          chat.splice(chat.length - 1, 1);
        }
        chat.push({ role: res.role, content: res.content });
        this.chat = chat;

        return chat.map((item, idx) => ({
          ...item,
          status: res.status,
          msgIndex: idx
        }));
      })
    );
  }

  private currentGesprech$: Observable<iMessageStatus[]> = of([]);

  private async getStreamResponse(request: { model: string; input: any[] }) {
    try {
      const res = await fetch(this.API_RESPONSES, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${environment.api_key}`,
        },
        method: "POST",
        body: JSON.stringify({
          model: request.model,
          input: request.input,
          stream: true,
          verbosity: "low",
          reasoning: { effort: "medium" },
          service_tier: "flex",
        }),
      });

      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let current: iMessageStatus = { role: 'assistant', content: '', status: null };

      const processChunk = (value: Uint8Array) => {
        const tmpa = decoder.decode(value);
        const data = tmpa.split('data: ');

        for (let i = 0; i < data.length; i++) {
          try {
            if (!data[i].trim() || data[i] === '[DONE]') continue;
            const ob = JSON.parse(data[i]);
            
            if (ob.choices?.[0]?.delta?.content) {
              current.content += ob.choices[0].delta.content;
              this.stream.next({ ...current });
            }
            if (ob.choices?.[0]?.finish_reason) {
              current.status = ob.choices[0].finish_reason;
            }
          } catch {}
        }
      };

      const updateStream = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            const threadId = this.currentThreadId();
            if (threadId && current.content) {
              this.historyService.addMessage(threadId, { role: 'assistant', content: current.content } as iMessageContent);
            }
            this.stream.next(current);
            return;
          }

          if (value) {
            processChunk(value);
          }
          updateStream();
        });
      };
      updateStream();
    } catch (err) {
      console.error('API Error:', err);
      this.stream.next({ role: 'assistant', content: 'Error: ' + (err as any)?.message, status: 'error' });
    }
  }

  async getEmbedding(text: string): Promise<number[]> {
    const res = await fetch(this.API_EMBEDDINGS, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${environment.api_key}`,
      },
      method: "POST",
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text
      }),
    });

    const data = await res.json();
    return data.data?.[0]?.embedding || [];
  }

  resetChat(resetHistory: boolean = false) {
    this.chat = [];
    this.stream.next({role: '', content: '', status: null});
    if (resetHistory) {
      this.currentThreadId.set(null);
    }
    return of([]);
  }

  setThread(threadId: string) {
    this.currentThreadId.set(threadId);
    const conv = this.historyService.getConversation(threadId);
    if (conv) {
      this.chat = conv.messages.map(m => ({ role: m.role, content: m.content }));
      return conv.messages;
    }
    return [];
  }

  getSystemPrompt(): string {
    const threadId = this.currentThreadId();
    if (threadId) {
      return this.historyService.getSystemPrompt(threadId);
    }
    return this.defaultSystemPrompt;
  }

  setSystemPrompt(prompt: string) {
    const threadId = this.currentThreadId();
    if (threadId) {
      this.historyService.setSystemPrompt(threadId, prompt);
    }
  }

  genImage(prompt: string, n: number = 1, size: string = '1024x1024') {
    const body = { prompt, n, size, response_format: 'url' };
    return this.http.post<any>(this.API_BILDER, body);
  }

  genImages(prompts: string[], n: number = 1, size: string = '1024x1024') {
    return Promise.all(prompts.map(p => this.genImage(p, n, size)));
  }
}