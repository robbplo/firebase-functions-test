const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info('Hello logs!', {structuredData: true});
  response.send('Hello from Firebase!');
});

exports.enterQueue = functions.https.onCall(async (data, context) => {
  const firestore = admin.firestore();

  const userIsQueuedSnapshot = await firestore.collection('queue')
      .where('uid', '==', context.auth.uid)
      .limit(1)
      .get();


  if (userIsQueuedSnapshot.empty) {
    await firestore.collection('queue').add({
      uid: context.auth.uid,
    });
  }
});

exports.userSaver = functions.auth.user().onCreate(async (user, ctx) => {
  const firestore = admin.firestore();

  // Make a document in the user's collection with everything we know about the
  // user
  const userId = user.uid;
  const userRef = firestore.collection('users').doc(userId);
  console.log(user.toJSON());
  await userRef.set({
    uid: userId,
    email: user.email,
    phone: user.phoneNumber,
    score: 0,
    created_at: user.metadata.creationTime,
  });
});
