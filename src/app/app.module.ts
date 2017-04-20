import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { AngularFireModule, AuthProviders, AuthMethods } from "angularfire2";
// Must export the config
export const firebaseConfig = {
  apiKey: "AIzaSyAzm0I63MhgwdqamkSgyuVIPGwDojcJC_U",
  authDomain: "chatterific-beb9a.firebaseapp.com",
  databaseURL: "https://chatterific-beb9a.firebaseio.com",
  projectId: "chatterific-beb9a",
  storageBucket: "chatterific-beb9a.appspot.com",
  messagingSenderId: "586474610216"
};
const firebaseAuthConfig = {
  provider: AuthProviders.Google,
  method: AuthMethods.Popup
};

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    AngularFireModule.initializeApp(firebaseConfig, firebaseAuthConfig)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
