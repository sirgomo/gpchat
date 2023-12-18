import { ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { Observable, Subject, Subscription, take, tap } from 'rxjs';
import { iMessageStatus } from '../models/messStatus';
import { iMessage } from '../models/message';
import { GpService } from '../services/gpservice';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnDestroy {
  @ViewChild('stream', {static: true}) private streamElement: ElementRef<HTMLDivElement> | undefined
  @ViewChild('autosize') autosize!: CdkTextareaAutosize;
  title = 'gpchat';
  model$ = this.service.getMoodel();
  response$ = new Observable<iMessageStatus[]>();
  data = '';
  selectedModel = '';
  loged = this.service.getlogeg();
  system_role = '';
  des$ = new Subscription();

  constructor (private service: GpService, private _ngZone: NgZone) {}
  ngOnDestroy(): void {
    this.service.getlogeg().set(false);
    this.des$.unsubscribe();
  }

  verschicken() {
    let mess: iMessage = {} as iMessage;

    mess.model = this.selectedModel;
    mess.temperature = 0.5;
    mess.max_tokens = null;
    mess.stream = true;
    if(this.system_role.length > 2) {
      mess.messages = [
        { role: 'system', content: this.system_role},
        {role: 'user', content: this.data}
      ];
    } else {
      mess.messages = [
        {role: 'user', content: this.data}
      ];
    }

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
  this.system_role = '';
  }
  triggerResize() {
   this.des$ = this._ngZone.onStable.pipe(take(1)).subscribe(() => this.autosize.resizeToFitContent(true));
  }
}
