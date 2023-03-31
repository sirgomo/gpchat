import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { RouterLink } from "@angular/router";
import { catchError, combineLatest, concatMap, count, EMPTY, map, merge, mergeMap, Observable, of, scan, shareReplay, startWith, switchMap, tap } from "rxjs";
import { GpModels } from "../models/gpModel";
import { Message } from "../models/message";

@Injectable({
  providedIn: 'root'
})
export class GpService {
  API_MODELS = 'https://api.openai.com/v1/models';
  API_CHAT = 'https://api.openai.com/v1/chat/completions';
  API_BILDER = 'https://api.openai.com/v1/images/generations';
  constructor(private http: HttpClient) {}
  currentGespraech$ = new Observable<any[]>();
  chat : {role: string, content: string}[] = [];
  getMoodel() {
    return this.http.get<GpModels[]>(this.API_MODELS).pipe(map((res) => {
      return Object(res).data.filter((ob: { owned_by: string; }) => ob.owned_by === "openai");
    //  return Object(res).data;
    }))
  }
  sendMessage(inMessag: Message) {
    const mess = {inMessag };
    console.log(inMessag);

    console.log('czekam na odpowiedz... ');
    this.chat.push(inMessag.messages[0]);
    inMessag.messages = this.chat;
    console.log(inMessag.messages);
    return this.http.post<any[]>(this.API_CHAT, inMessag).pipe(map((res) => {

      const ressa = Object(res).choices[0].message.content;

      console.log(res);
      this.chat.push({role: 'assistant', content:  ressa});
    // this.chat.push( Object(res).choices[0].message.content);
     return this.chat;
    }));
  }
  resetChat() {
    this.chat.splice(0, this.chat.length);
  }

  genImage() {

  }
}
