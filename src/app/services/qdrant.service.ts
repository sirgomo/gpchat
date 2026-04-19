import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, switchMap, catchError } from 'rxjs';
import { environment } from '../../environment/environment';

export interface iQdrantPoint {
  id: number | string;
  vector: number[];
  payload: {
    content: string;
    role: string;
    conversationId: string;
    timestamp: number;
  };
}

export interface iQdrantSearchResult {
  id: number | string;
  score: number;
  payload: {
    content: string;
    role: string;
    conversationId: string;
    timestamp: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class QdrantService {
  private QDRANT_URL = environment.qdrant_url || 'http://localhost:6333';
  private OLLAMA_URL = environment.ollama_url || 'http://localhost:11434';
  private COLLECTION = 'chat_history';
  private VECTOR_SIZE = 384;

  constructor(private http: HttpClient) {
    if (environment.ollama_model) {
      this.VECTOR_SIZE = 384;
    } else if (environment.qdrant_model === 'text-embedding-3-small') {
      this.VECTOR_SIZE = 1536;
    } else {
      this.VECTOR_SIZE = 1536;
    }
  }

  createCollection(): Observable<any> {
    return this.http.put(`${this.QDRANT_URL}/collections/${this.COLLECTION}`, {
      vectors: {
        size: this.VECTOR_SIZE,
        distance: 'Cosine'
      }
    });
  }

  collectionExists(): Observable<boolean> {
    return this.http.get<any>(`${this.QDRANT_URL}/collections/${this.COLLECTION}`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  async getEmbedding(text: string): Promise<number[]> {
    const model = environment.ollama_model || 'nomic-embed-text';
    
    try {
      const res = await fetch(`${this.OLLAMA_URL}/api/embeddings`, {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({ model, prompt: text })
      });
      
      const data = await res.json();
      return data.embedding || [];
    } catch {
      return new Array(this.VECTOR_SIZE).fill(0);
    }
  }

  addPoint(conversationId: string, role: string, content: string): Observable<any> {
    return new Observable(subscriber => {
      this.getEmbedding(content).then(vector => {
        const point = {
          id: `${conversationId}_${Date.now()}`,
          vector,
          payload: {
            content,
            role,
            conversationId,
            timestamp: Date.now()
          }
        };
        
        this.http.put(`${this.QDRANT_URL}/collections/${this.COLLECTION}/points`, {
          points: [point]
        }).subscribe({
          next: (res) => {
            subscriber.next(res);
            subscriber.complete();
          },
          error: (err) => subscriber.error(err)
        });
      });
    });
  }

  searchSimilar(query: string, conversationId: string, limit: number = 5): Observable<iQdrantSearchResult[]> {
    return new Observable(subscriber => {
      this.getEmbedding(query).then(vector => {
        this.http.post<any>(`${this.QDRANT_URL}/collections/${this.COLLECTION}/points/search`, {
          limit,
          score_threshold: 0.7,
          query_filter: {
            must: [
              {
                key: 'payload.conversationId',
                match: { value: conversationId }
              }
            ]
          },
          query_vector: vector
        }).subscribe({
          next: (res) => {
            subscriber.next(res.result || []);
            subscriber.complete();
          },
          error: (err) => {
            subscriber.next([]);
            subscriber.complete();
          }
        });
      });
    });
  }

  getHistory(conversationId: string, limit: number = 50): Observable<iQdrantSearchResult[]> {
    return this.http.post<any>(`${this.QDRANT_URL}/collections/${this.COLLECTION}/points/search`, {
      limit,
      query_filter: {
        must: [
          {
            key: 'payload.conversationId',
            match: { value: conversationId }
          }
        ]
      },
      query_vector: new Array(this.VECTOR_SIZE).fill(0)
    }).pipe(
      map(res => res.result || [])
    );
  }

  deleteConversation(conversationId: string): Observable<any> {
    return this.http.post(`${this.QDRANT_URL}/collections/${this.COLLECTION}/points/delete`, {
      filter: {
        must: [
          {
            key: 'payload.conversationId',
            match: { value: conversationId }
          }
        ]
      }
    });
  }

  clearAll(): Observable<any> {
    return this.http.post(`${this.QDRANT_URL}/collections/${this.COLLECTION}/points/delete`, {
      filter: { must_all: [] }
    });
  }

  deleteCollection(): Observable<any> {
    return this.http.delete(`${this.QDRANT_URL}/collections/${this.COLLECTION}`);
  }
}