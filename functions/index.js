const language = require('@google-cloud/language')();
const functions = require('firebase-functions');
// Import and initialize the Firebase Admin SDK.
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// Adds a message that welcomes new users into the chat.
exports.addWelcomeMessages = functions.auth.user().onCreate((event) => {
    const user = event.data;
    console.log('A new user signed in for the first time.');
    const fullName = user.displayName || 'Anonymous';

    // Saves the new welcome message into the database
    // which then displays it in the FriendlyChat clients.
    return admin.database().ref('messages').push({
        user: user,
        text: `${fullName} signed in for the first time! Welcome!`
    });
});
// Adds a message that welcomes new users into the chat.
exports.addWelcomeMessages = functions.auth.user().onCreate((event) => {
    const user = event.data;
    console.log('A new user signed in for the first time.');
    const fullName = user.displayName || 'Anonymous';

    // Saves the new welcome message into the database
    // which then displays it in the FriendlyChat clients.
    return admin.database().ref('messages').push({
        user: user,
        text: `${fullName} signed in for the first time! Welcome!`
    });
});

// Annotates messages using the Cloud Natural Language API
exports.annotateMessages = functions.database.ref('/messages/{messageId}').onWrite((event) => {
    const snapshot = event.data;
    const messageId = event.params.messageId;

    // Only annotate new messages.
    if (snapshot.previous.val() || !snapshot.val().text) {
        return;
    }

    // Annotation arguments.
    const text = snapshot.val().text;
    const options = {
        entities: true,
        sentiment: true
    };

    console.log('Annotating new message.');
    return admin.database().ref(`/messages`).once('value').then((snapshot) => {
        console.log(snapshot.numChildren());
        let finalText = ''; snapshot.forEach((message) => {
            console.log('current Text', message.val().text);
            console.log('final text', finalText);
            finalText = finalText + ' ' + message.val().text
        });
        console.log(finalText);
        if (snapshot.numChildren() > 5) {
            // Detect the sentiment and entities of the new message.
            return language.annotate(finalText, options)
                .then((result) => {
                    console.log('Saving annotations.');

                    // Update the message with the results.
                    return admin.database().ref(`/sentiments`).push({
                        sentiment: result[0].sentiment,
                        entities: result[0].entities.map((entity) => {
                            return {
                                name: entity.name,
                                salience: entity.salience
                            };
                        })
                    });
                });
        }
        else{
            return true;
        }
    })
});