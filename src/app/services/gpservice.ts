import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { RouterLink } from "@angular/router";
import { BehaviorSubject, catchError, combineLatest, concatMap, count, EMPTY, map, merge, mergeMap, Observable, of, scan, shareReplay, startWith, switchMap, tap } from "rxjs";
import { GpModels } from "../models/gpModel";
import { Message } from "../models/message";
import { ParsedEvent } from "@angular/compiler";
import { createParser, ReconnectInterval } from "eventsource-parser";

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
  stream: BehaviorSubject<string> =  new BehaviorSubject<string>('');
  isStreamDone : boolean = false;
  streamObs$ = this.stream.asObservable();


  getMoodel() {
    return this.http.get<GpModels[]>(this.API_MODELS).pipe(map((res) => {
      return Object(res).data.filter((ob: { owned_by: string; }) => ob.owned_by === "openai");
    //  return Object(res).data;
    }))
  }
sendMessage(inMessag: Message) {
    const mess = {inMessag };

    this.chat.push(inMessag.messages[0]);
    inMessag.messages = this.chat;
    console.log(inMessag.messages);


   this.getStream(inMessag);
    return combineLatest([of(this.chat), this.streamObs$]).pipe((map(([chat, tmp]) => {

    if(tmp.length > 10)
    {
    //  this.chat.push({role: 'assistent', content: tmp[0]});
    if(!this.isStreamDone && this.chat.length > 0 && this.chat[this.chat.length-1].role !== 'user')
      this.chat.splice(1, this.chat.length-1);


      this.chat.push({ role: 'assistant', content: tmp });
    //return [...chat, {role: 'assistant', content: tmp}];
    }
    return this.chat;
  })));


}
 async getStream(inMessag: Message) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer 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`,
    },
    method: "POST",
    body: JSON.stringify(inMessag),
  });
    let streamDone = false;
    this.isStreamDone = streamDone;
    let reader = res.body?.getReader();
    let current = '';
    const tmpstream = this.stream;
    const decoder = new TextDecoder();
    let coutn = 0 ;

    new ReadableStream({
      start(controller) {
        function push() {
          if (reader === undefined) {
            controller.close();
            streamDone = true;
            tmpstream.next(current);
            return;
          }

          reader.read().then(({ done, value }) => {

            if (done) {
              controller.close();
              streamDone = true;
              tmpstream.next(current);
              return;
            }

            let tmpa = decoder.decode(value); //= decoder.decode(value);

            coutn++;


            const data = tmpa.split('data: ');
            for (let i = 0; i < data.length; i++) {
             try {
              const ob = Object(JSON.parse(data[i]));
            if (ob.choices[0].delta.content) {
              current += '' + ob.choices[0].delta.content;
              tmpstream.next(current);
            }

             } catch (err) {

             }
            }



            push();
          }, (err) => {
           console.log(err);
          });
        }
        push();
      },
    })
 }
  resetChat() {
    this.chat.splice(0, this.chat.length);
    this.stream.next('');
  }

  genImage() {

  }
}

