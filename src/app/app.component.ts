import { User } from './shared/models/user.model';
import { FirebaseListObservable } from 'angularfire2/database';
import { AngularFire, FirebaseAuthState, FirebaseObjectObservable } from 'angularfire2';
import { Component } from '@angular/core';
import { UserInfo } from "firebase";
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  public message: string;
  public messages: FirebaseListObservable<any[]>;
  public sentiment: FirebaseListObservable<any[]>;
  public user: UserInfo;
  constructor(public af: AngularFire) {
    this.messages = this.af.database.list('/messages');
    this.sentiment = <FirebaseListObservable<any[]>>this.af.database.list('/sentiments')
      .do(objects => { console.log(objects) })
      .map(objects => {  return objects[objects.length-1]? objects[objects.length-1].sentiment : null})
    this.af.auth.subscribe(((authState: FirebaseAuthState) => { if (authState) { this.user = new User(authState.auth.displayName, authState.auth.email, authState.auth.photoURL, authState.auth.providerId, authState.auth.uid) } }));
  }
  login() {
    this.af.auth.login()
  }

  logout() {
    this.af.auth.logout();
  }

  sendMessage($event) {
    $event.preventDefault();
    this.messages.push({ text: this.message, user: this.user });
    this.message = null;
  }
}
