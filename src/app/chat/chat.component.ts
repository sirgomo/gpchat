import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { iMessageStatus } from '../models/messStatus';
import { iMessage } from '../models/message';
import { GpService } from '../services/gpservice';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnDestroy {
  @ViewChild('stream', {static: true}) private streamElement: ElementRef<HTMLDivElement> | undefined
  title = 'gpchat';
  model$ = this.service.getMoodel();
  response$ = new Observable<iMessageStatus[]>();
  data = '';
  selectedModel = '';
  loged = this.service.getlogeg();
  system_role = '';

  constructor (private service: GpService) {}
  ngOnDestroy(): void {
    this.service.getlogeg().set(false);
  }

  verschicken() {
    let mess: iMessage = {} as iMessage;

    mess.model = this.selectedModel;
    mess.temperature = 0.7;
    mess.max_tokens = 2048;
    mess.stream = true;
    mess.messages = [{role: 'user', content: this.data}];
    this.response$ = this.service.sendMessage(mess).pipe(
      tap((res) => {

        if(this.streamElement === undefined ) return ;

          this.streamElement.nativeElement.scrollTo({
            top: this.streamElement.nativeElement.scrollHeight - this.streamElement.nativeElement.clientHeight,
            behavior: 'smooth'
          })
      })
    );
  }
  chatReset() {
  this.response$ =  this.service.resetChat();
  }

}
