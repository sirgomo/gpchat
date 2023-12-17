import { Component } from '@angular/core';
import { environment } from 'src/environment/environment';
import * as bcrypt from 'bcryptjs';
import { GpService } from '../services/gpservice';
import { Router } from '@angular/router';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  user!: string;
  pass!: string;
  constructor(private ser: GpService, private router: Router ) {}
  async login() {
      if(!this.user || !this.pass)
        return;

        const myPlaintextPassword = this.pass.trim()+environment.pay_key.trim();
        const hashe = await bcrypt.hash(myPlaintextPassword.trim(), 10);

       await bcrypt.compare(myPlaintextPassword, environment.pass ).then((res) => {

        if(res) {
          this.ser.setLoged();
          this.router.navigateByUrl('/');
        }

       });


  }
}
