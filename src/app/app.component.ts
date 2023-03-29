import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { UrlSerializer } from '@angular/router';
import { Observable } from 'rxjs';
import { Message } from './models/message';
import { GpService } from './services/gpservice';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {

  title = 'gpchat';
  model$ = this.service.getMoodel();
  response$ = new Observable<any[]>();
  data = '';
  selectedModel = '';
  constructor (private service: GpService) {}

  verschicken() {
    let mess: Message = {} as Message;

    mess.model = this.selectedModel;
    mess.temperature = 0.7;
    mess.max_tokens = 2048;
    mess.messages = [{role: 'user', content: this.data}];
    this.response$ = this.service.sendMessage(mess);
  }
  chatReset() {
    this.service.resetChat();
  }
}
