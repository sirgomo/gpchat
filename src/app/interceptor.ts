import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpEvent, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class Interceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = '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';
   // const myHeaders = new Headers();
   // myHeaders.set('Authorization: Bearer ', token);
     const authReq = req.clone({
      headers: req.headers.set('Authorization', 'Bearer '+token)
    });

    return next.handle(authReq);
  }
}
