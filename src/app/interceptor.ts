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
      //.set('Content-Type', 'text/html')
    });

    return next.handle(authReq);
  }
}
