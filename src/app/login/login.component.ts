import { Component } from '@angular/core';
import { environment } from 'src/environment/environment';
import * as bcrypt from 'bcrypt';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  user!: string;
  pass!: string;

  async login() {
      if(!this.user || !this.pass)
        return;

        const pass = environment.pay_key;


        const saltRounds = 10;
        const myPlaintextPassword = this.pass+pass;


         await bcrypt.hash(myPlaintextPassword, saltRounds, (err, hash) => {
             console.log(hash);
           })
  }
}
