const language = require('@google-cloud/language')();
const functions = require('firebase-functions');
const gcs = require('@google-cloud/storage')();
const vision = require('@google-cloud/vision')();
const exec = require('child-process-promise').exec;
// Import and initialize the Firebase Admin SDK.
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// // Adds a message that welcomes new users into the chat.
// exports.addWelcomeMessages = functions.auth.user().onCreate((event) => {
//     const user = event.data;
//     console.log('A new user signed in for the first time.');
//     const fullName = user.displayName || 'Anonymous';

//     // Saves the new welcome message into the database
//     // which then displays it in the FriendlyChat clients.
//     return admin.database().ref('messages').push({
//         user: user,
//         text: `${fullName} signed in for the first time! Welcome!`
//     });
// });

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

    // Detect the sentiment and entities of the new message.
    return language.annotate(text, options)
        .then((result) => {
            console.log('Saving annotations.');

            // Update the message with the results.
            return admin.database().ref(`/messages/${messageId}`).update({
                sentiment: result[0].sentiment,
                entities: result[0].entities.map((entity) => {
                    return {
                        name: entity.name,
                        salience: entity.salience
                    };
                })
            });
        });
});

// Adds newly authenticated users to the users collection in the database
exports.addNewUsersToCollection = functions.auth.user().onCreate((event) => {
    const user = event.data;
    console.log('Saving user with a name', user.displayName)
    return new Promise((resolve, reject) => admin.database().ref('users').push(
        user).then(() => { resolve(); }))
});



// Blurs uploaded images that are flagged as Adult or Violence.
exports.blurOffensiveImages = functions.storage.object().onChange((event) => {
    const object = event.data;
    // Exit if this is a deletion or a deploy event.
    if (object.resourceState === 'not_exists') {
        return console.log('This is a deletion event.');
    } else if (!object.name) {
        return console.log('This is a deploy event.');
    }

    const messageId = object.name.split('/')[1];
    const bucket = gcs.bucket(object.bucket);
    const file = bucket.file(object.name);

    return admin.database().ref(`/messages/${messageId}/moderated`).once('value')
        .then((snapshot) => {
            console.log(snapshot.val());
            // The image has already been moderated.
            if (snapshot.val()) {
                return;
            }

            // Check the image content using the Cloud Vision API.
            return vision.detectSafeSearch(file);
        })
        .then((safeSearchResult) => {
            if (safeSearchResult && (safeSearchResult[0].adult || safeSearchResult[0].violence)) {
                console.log('The image', object.name, 'has been detected as inappropriate.');
                return blurImage(object.name, bucket);
            } else {
                console.log('The image', object.name, 'has been detected as OK.');
            }
        });
});

// Blurs the given image located in the given bucket using ImageMagick.
function blurImage(filePath, bucket, metadata) {
    const fileName = filePath.split('/').pop();
    const tempLocalFile = `/tmp/${fileName}`;
    const messageId = filePath.split('/')[1];

    // Download file from bucket.
    return bucket.file(filePath).download({ destination: tempLocalFile })
        .then(() => {
            console.log('Image has been downloaded to', tempLocalFile);
            // Blur the image using ImageMagick.
            return exec(`convert ${tempLocalFile} -channel RGBA -blur 0x24 ${tempLocalFile}`);
        })
        .then(() => {
            console.log('Image has been blurred');
            // Uploading the Blurred image back into the bucket.
            return bucket.upload(tempLocalFile, { destination: filePath });
        })
        .then(() => {
            console.log('Blurred image has been uploaded to', filePath);
            // Indicate that the message has been moderated.
            return admin.database().ref(`/messages/${messageId}`).update({ moderated: true });
        })
        .then(() => {
            console.log('Marked the image as moderated in the database.');
        });
}
