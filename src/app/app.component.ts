import { Observable } from 'rxjs/Observable';
import { User } from './shared/models/user.model';
import { FirebaseListObservable } from 'angularfire2/database';
import { AngularFire, FirebaseAuthState, FirebaseObjectObservable } from 'angularfire2';
import { Component } from '@angular/core';
import { UserInfo } from "firebase";
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/merge';
import 'rxjs/add/operator/mergeAll';
import 'rxjs/add/operator/filter';
import 'rxjs';
import * as firebase from 'firebase';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public messages: Observable<any[]>;
  public sentiment: FirebaseListObservable<any[]>;
  public users$: Observable<any[]>;
  public lastMessage$ : Observable<any>;
  public selectedUser: UserInfo = null;

  public message: string;
  public user: UserInfo;
  selectUser(selectedUser: UserInfo) {

    this.selectedUser = selectedUser;
    this.messages = Observable.combineLatest(
      this.af.database.list('/messages', {
        query: {
          orderByChild: 'from',
          equalTo: this.user.uid
        }
      })
      .map(messages => messages.filter(message=>message.to === this.selectedUser.uid)),

      this.af.database.list('/messages', {
        query: {
          orderByChild: 'to',
          equalTo: this.user.uid
        }
      })
      .map(messages => messages.filter(message=>message.from === this.selectedUser.uid)),
    )
      .map((messages: [Array<any>, Array<any>]) => [...messages[0], ...messages[1]].sort((a, b) => a.timestamp - b.timestamp));

      this.lastMessage$ = this.messages.map(messages=>messages[messages.length-1]);
  }
  constructor(public af: AngularFire) {
    ;
    this.sentiment = <FirebaseListObservable<any[]>>this.af.database.list('/sentiments')
      .do(objects => { console.log(objects) })
      .map(objects => { return objects[objects.length - 1] ? objects[objects.length - 1].sentiment : null })
    this.af.auth.subscribe(((authState: FirebaseAuthState) => {
      if (authState) {
        this.user = new User(authState.auth.displayName, authState.auth.email, authState.auth.photoURL, authState.auth.providerId, authState.auth.uid);
        this.users$ = this.af.database.list('/users').map(users => users.filter(user => user.uid !== this.user.uid));
      }
    }));
  }
  login() {
    this.af.auth.login()
  }

  logout() {
    this.af.auth.logout();
  }

  sendMessage($event) {
    $event.preventDefault();
    this.af.database.list('/messages').push({ timestamp: firebase.database.ServerValue.TIMESTAMP, text: this.message, user: this.user, from: this.user.uid, to: this.selectedUser.uid });
    this.message = null;
  }
}
