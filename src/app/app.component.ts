import { Observable } from 'rxjs/Observable';
import { User } from './shared/models/user.model';
import { FirebaseListObservable } from 'angularfire2/database';
import { FirebaseApp, AngularFire, FirebaseAuthState, FirebaseObjectObservable } from 'angularfire2';
import { Directive, Inject, Component, ElementRef } from '@angular/core';
import { UserInfo } from "firebase";
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/merge';
import 'rxjs/add/operator/mergeAll';
import 'rxjs/add/operator/filter';
import 'rxjs';
import * as firebase from 'firebase';
const LOADING_IMAGE_URL = 'assets/spinner.gif';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public messages: Observable<any[]>;
  public sentiment: FirebaseListObservable<any[]>;
  public users$: Observable<any[]>;
  public lastMessage$: Observable<any>;
  public totalSentiment$: Observable<any>;
  public selectedUser: UserInfo = null;

  fbApp: any;
  public message: string;
  public user: UserInfo = null;
  newMessageAdded(){
    this.elementRef.nativeElement.querySelector('.chat').scrollTop = this.elementRef.nativeElement.querySelector('.scroller').offsetHeight;
  }
  selectUser(selectedUser: UserInfo) {

    this.selectedUser = selectedUser;
    this.messages = Observable.combineLatest(
      this.af.database.list('/messages', {
        query: {
          orderByChild: 'from',
          equalTo: this.user.uid
        }
      })
        .map(messages => messages.filter(message => message.to === this.selectedUser.uid)),

      this.af.database.list('/messages', {
        query: {
          orderByChild: 'to',
          equalTo: this.user.uid
        }
      })
        .map(messages => messages.filter(message => message.from === this.selectedUser.uid)),
    )
      .map((messages: [Array<any>, Array<any>]) => [...messages[0], ...messages[1]].sort((a, b) => a.timestamp - b.timestamp));

    this.lastMessage$ = this.messages.map(messages => messages[messages.length - 1]);
    this.totalSentiment$ = this.messages
      .map(messages => messages
        // .filter((message, index, array) => array.indexOf(array.find(_message=>_message.text===message.text)) === index)
        .reduce((accumulator, currentMessage, index) => {
          if (index === 1) {
            accumulator = accumulator.sentiment ? accumulator.sentiment.score : 0;
          }
          currentMessage.sentiment = currentMessage.sentiment || { score: 0 }
          return Number(accumulator) + Number(currentMessage.sentiment.score);
        })
      )
      .map(totalSentiment => {
        if (totalSentiment > 1) {
          totalSentiment = 1
        }
        if (totalSentiment < -1) {
          totalSentiment = -1;
        }
        return totalSentiment;
      })
  }
  constructor(private elementRef: ElementRef, public af: AngularFire, @Inject(FirebaseApp) fbApp: any) {
    this.fbApp = fbApp;
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
  trackByFn(index, item){
    return index;
  }

  logout() {
    this.af.auth.logout().then(() => {
      this.user = null;
      this.messages = Observable.of([]);
      this.users$ = Observable.of([]);
    });
  }

  // TODO: Refactor into image message form component
  onImageClick(event: any) {
    event.preventDefault();
    document.getElementById('mediaCapture').click();
  }
  ngAfterViewChecked(){
    console.log('after view checked executed!');
  }
  // TODO: Refactor into image message form component
  saveImageMessage(event: any) {
    event.preventDefault();
    const file = event.target.files[0];

    // Clear the selection in the file picker input.
    const imageForm = <HTMLFormElement>document.getElementById('image-form');
    imageForm.reset();


    // Check if the user is signed-in

    // We add a message with a loading icon that will get updated with the shared image.
    const messages = this.af.database.list('/messages');
    messages.push({
      imageUrl: LOADING_IMAGE_URL,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      text: null,
      user: this.user,
      from: this.user.uid,
      to: this.selectedUser.uid

    }).then((data) => {
      // Upload the image to Cloud Storage.
      const filePath = `${this.user.uid}/${data.key}/${file.name}`;
      return this.fbApp.storage().ref(filePath).put(file)
        .then((snapshot) => {
          // Get the file's Storage URI and update the chat message placeholder.
          const fullPath = snapshot.metadata.fullPath;
          const imageUrl = this.fbApp.storage().ref(fullPath).toString();
          return this.fbApp.storage().refFromURL(imageUrl).getMetadata();
        }).then((metadata) => {
          // TODO: Instead of saving the download URL, save the GCS URI and
          //       dynamically load the download URL when displaying the image
          //       message.
          return data.update({
            imageUrl: metadata.downloadURLs[0]
          });
        });
    });
  }
  sendMessage($event) {
    $event.preventDefault();
    this.af.database.list('/messages')
      .push({ timestamp: firebase.database.ServerValue.TIMESTAMP, text: this.message, user: this.user, from: this.user.uid, to: this.selectedUser.uid });
    this.message = null;
  }
}
