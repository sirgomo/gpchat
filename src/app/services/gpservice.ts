import { HttpClient } from "@angular/common/http";
import { Injectable, signal } from "@angular/core";
import { BehaviorSubject, catchError, combineLatest, concat, concatMap, count, EMPTY, map, merge, mergeMap, Observable, of, scan, startWith, switchMap } from "rxjs";
import { iGpModels } from "../models/gpModel";
import { iMessage } from "../models/message";
import { environment } from "src/environment/environment";
import { iMessageStatus } from "../models/messStatus";

@Injectable({
  providedIn: 'root'
})
export class GpService {
  API_MODELS = 'https://api.openai.com/v1/models';
  API_CHAT = 'https://api.openai.com/v1/chat/completions';
  API_BILDER = 'https://api.openai.com/v1/images/generations';
  constructor(private http: HttpClient) {}
  currentGesprech$ = new Observable<iMessageStatus[]>();
  chat : {role: string, content: string}[] = [];
  stream: BehaviorSubject<iMessageStatus> =  new BehaviorSubject<iMessageStatus>({role: '', content: '', status: null});
  isStreamDone : boolean = false;
  streamObs$ = this.stream.asObservable();

  #loged = signal(false);

  getMoodel() {
    return this.http.get<iGpModels[]>(this.API_MODELS).pipe(map((res) => {
      console.log(res)
      const items: Array<any> =  Object(res).data.filter((ob: { owned_by: string; }) => ob.owned_by === "openai" || ob.owned_by === "system");
      return items;
    }))
  }
  setLoged() {
    this.#loged.set(true);
  }
  getlogeg() {
    return this.#loged;
  }
sendMessage(inMessag: iMessage) {


    this.chat.push(inMessag.messages[0]);
    inMessag.messages = this.chat;



   this.getStream(inMessag);




  return this.currentGesprech$ = combineLatest([of(this.chat), this.streamObs$]).pipe(

    map(([chat, res]) => {
      if(res.role === '') {
        return chat.map((item) => {
          return { ...item,
           status: res.status
          }
         })

      }

      if(chat[chat.length-1].role === 'assistant'){
        chat.splice(chat.length-1,1)
      }
        chat.push({role: res.role, content: res.content});

      return chat.map((item) => {
        return { ...item,
         status: res.status
        }
       })
    })
  )


}
 async getStream(inMessag: iMessage) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${environment.api_key}`,
    },
    method: "POST",
    body: JSON.stringify(inMessag),
  });
    let streamDone = false;
    this.isStreamDone = streamDone;
    let reader = res.body?.getReader();
    let current: iMessageStatus = {role:'assistant', content: '', status: null} ;
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

            let tmpa = decoder.decode(value);

            coutn++;


            const data = tmpa.split('data: ');

            for (let i = 0; i < data.length; i++) {
             try {
              const ob = Object(JSON.parse(data[i]));

                current.status = ob.choices[0].finish_reason;
                if (ob.choices[0].delta.content) {
                  current.content += ob.choices[0].delta.content;
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
    this.currentGesprech$ = new Observable<iMessageStatus[]>();
    this.stream.next({role: '', content: '', status: null});
    return this.currentGesprech$;
  }
  genImage() {

  }

}

