import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { iMessage } from './models/message';
import { GpService } from './services/gpservice';
import { iMessageStatus } from './models/messStatus';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  @ViewChild('stream', {static: true}) private streamElement: ElementRef<HTMLDivElement> | undefined
  title = 'gpchat';
  model$ = this.service.getMoodel();
  response$ = new Observable<iMessageStatus[]>();
  data = '';
  selectedModel = '';
  constructor (private service: GpService) {}

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
