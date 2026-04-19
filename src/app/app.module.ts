import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { Interceptor } from './interceptor';
import { LoginComponent } from './login/login.component';
import { ChatComponent } from './chat/chat.component';
import {TextFieldModule} from '@angular/cdk/text-field';
import {MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { GpService } from './services/gpservice';
import { HistoryService } from './services/history.service';
import { QdrantService } from './services/qdrant.service';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    ChatComponent,

  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    TextFieldModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    BrowserAnimationsModule
  ],
  providers: [
    GpService,
    HistoryService,
    QdrantService,
    {provide: HTTP_INTERCEPTORS, useClass: Interceptor, multi: true },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        subscriptSizing: 'dynamic',
      }
    },

  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
