require('apiRTC-latest.min');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const firestore = admin.firestore();

exports.match = functions.https.onCall(async (data, context) => {
  const oneHourInMs = (60 * 60 * 6000);
  const now = new Date;
  const oneHourAgo = new Date(now.getTime() - oneHourInMs);

  const queuedUsers = await firestore.collection('status')
      .where('last_changed', '>', oneHourAgo)
      .where('state', '==', 'online')
      .orderBy('last_changed')
      .limit(2)
      .get();

  const selfExcluded = queuedUsers.docs
      .filter((user) => user.id !== context.auth.uid);

  // @todo exclude disliked users

  if (selfExcluded.length === 0) {
    // @todo maybe this should throw an error instead.
    return {
      matched: false,
      message: 'Could not match: no queued users',
    };
  }

  const recipientUid = selfExcluded[0].id;

  await firestore.collection('conversations').doc(context.auth.uid).set({
    connectionString: 'iets',
    recipient: recipientUid,
    timestamp: new Date,
  });

  await firestore.collection('conversations').doc(recipientUid).set({
    connectionString: 'iets anders',
    recipient: context.auth.uid,
    timestamp: new Date,
  });


  return {
    matched: true,
    uid: recipientUid,
  };
});

exports.userSaver = functions.auth.user().onCreate(async (user, ctx) => {
  // Make a document in the user's collection with everything we know about them
  const userId = user.uid;
  const userRef = firestore.collection('users').doc(userId);

  await userRef.set({
    uid: userId,
    email: user.email,
    phone: user.phoneNumber,
    score: 0,
    created_at: user.metadata.creationTime,
  });


  ua.register({

  });
});

exports.onUserStatusChanged = functions.database.ref('/status/{uid}').onUpdate(
    async (change, context) => {
    // Get the data written to Realtime Database
      const eventStatus = change.after.val();

      // Then use other event data to create a reference to the
      // corresponding Firestore document.
      const userStatusFirestoreRef = firestore
          .doc(`status/${context.params.uid}`);

      // It is likely that the Realtime Database change that triggered
      // this event has already been overwritten by a fast change in
      // online / offline status, so we'll re-read the current data
      // and compare the timestamps.
      const statusSnapshot = await change.after.ref.once('value');
      const status = statusSnapshot.val();

      // If the current timestamp for this data is newer than
      // the data that triggered this event, we exit this function.
      if (status.last_changed > eventStatus.last_changed) {
        return null;
      }

      // Otherwise, we convert the last_changed field to a Date
      eventStatus.last_changed = new Date(eventStatus.last_changed);

      // ... and write it to Firestore.
      await userStatusFirestoreRef.set(eventStatus);

      // Then clear any outstanding conversations for the user and the
      // recipient conversation
      const conversationRef = firestore.collection('conversations')
          .doc(context.auth.uid);

      const conversation = await conversationRef.get();
      if (conversation.exists) {
        const recipient = conversation.data().recipient;
        console.log(recipient);

        await firestore.collection('conversations').doc(recipient).delete();
        await conversationRef.delete();
      }
    });
