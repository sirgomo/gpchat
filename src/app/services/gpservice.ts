import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, combineLatest, concatMap, count, EMPTY, map, merge, mergeMap, Observable, of, scan, shareReplay, startWith, switchMap, tap } from "rxjs";
import { GpModels } from "../models/gpModel";
import { Message } from "../models/message";

@Injectable({
  providedIn: 'root'
})
export class GpService {
  API_MODELS = 'https://api.openai.com/v1/models';
  API_CHAT = 'https://api.openai.com/v1/chat/completions';
  constructor(private http: HttpClient) {}
  currentGespraech$ = new Observable<any[]>();
  chat : any[] = [];
  getMoodel() {
    return this.http.get<GpModels[]>(this.API_MODELS).pipe(map((res) => {
      return Object(res).data.filter((ob: { owned_by: string; }) => ob.owned_by === "openai");
    }))
  }
  sendMessage(inMessag: Message) {
    const mess = {model: inMessag.model, messages: [{role: inMessag.user, content: inMessag.content}]}
    /*
    const posts$ = merge((this.currentGespraech$,
    concatMap((mess) => this.http.post<any[]>(this.API_CHAT, mess).pipe(
      map((res) => { return [...res] })
    )))).pipe(scan((posts, post) => {
      if(posts === null) {
        return post || [];
      }
      return posts ? [...posts, ...post] : post;
    }, null));*/
    /*const post$ = this.http.post<any[]>(this.API_CHAT, mess).pipe(map((res) => {
      return  merge(this.currentGespraech$, res).pipe(scan((posts, post) => {
        return [...posts, ...post];
      }));
    }));*/
    console.log('czekam na odpowiedz... ');
  /*  const post$ = this.http.post<any[]>(this.API_CHAT, mess).pipe(
      switchMap((res) => {
        const message = [ Object(res).choices[0].message.content ];
        return merge(this.currentGespraech$, of(message)).pipe(
          scan((posts, post) => [...posts, ...post])
        );
      })
    );*/
    return this.http.post<any[]>(this.API_CHAT, mess).pipe(map((res) => {
      console.log('dodaje odpowiedz do tabeli');
       this.chat.push( Object(res).choices[0].message.content);
       return this.chat;
    }));


   // return this.currentGespraech$ = of(this.chat);


  }

}
