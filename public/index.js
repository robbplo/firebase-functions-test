/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Initialze Firebase pointing at our test project
firebase.initializeApp({
  projectId: "secondes-2d06a",
  apiKey: "fakeApiKey",
});

const firestore = firebase.firestore();
const database = firebase.database();
const auth = firebase.auth();
const functions = firebase.functions();

auth.useEmulator("http://localhost:9099");
functions.useEmulator("localhost", 5001)
firestore.useEmulator("localhost", 8080);
database.useEmulator("localhost", 9098)

const match = functions.httpsCallable('match');

function detectPresence() {
  console.log("Detecting presence")

// Fetch the current user's ID from Firebase Authentication.
  var uid = auth.currentUser.uid;

// Create a reference to this user's specific status node.
// This is where we will store data about being online/offline.
  var userStatusDatabaseRef = database.ref('/status/' + uid);
  var userStatusFirestoreRef = firestore.doc('/status/' + uid);

// We'll create two constants which we will write to
// the Realtime database when this device is offline
// or online.
  var isOfflineForDatabase = {
    state: 'offline',
    last_changed: firebase.database.ServerValue.TIMESTAMP,
  };

  var isOnlineForDatabase = {
    state: 'online',
    last_changed: firebase.database.ServerValue.TIMESTAMP,
  };

  var isOfflineForFirestore = {
    state: 'offline',
    last_changed: firebase.firestore.FieldValue.serverTimestamp(),
  };

  var isOnlineForFirestore = {
    state: 'online',
    last_changed: firebase.firestore.FieldValue.serverTimestamp(),
  };

// Create a reference to the special '.info/connected' path in
// Realtime Database. This path returns `true` when connected
// and `false` when disconnected.
  database.ref('.info/connected').on('value', function (snapshot) {
    console.log(snapshot.val())
    // If we're not currently connected, don't do anything.
    if (snapshot.val() === false) {
      userStatusFirestoreRef.set(isOfflineForFirestore);

      return;
    }

    // If we are currently connected, then use the 'onDisconnect()'
    // method to add a set which will only trigger once this
    // client has disconnected by closing the app,
    // losing internet, or any other means.
    userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase).then(function () {
      // The promise returned from .onDisconnect().set() will
      // resolve as soon as the server acknowledges the onDisconnect()
      // request, NOT once we've actually disconnected:
      // https://firebase.google.com/docs/reference/js/database.OnDisconnect

      // We can now safely set ourselves as 'online' knowing that the
      // server will mark us as offline once we lose connection.
      userStatusDatabaseRef.set(isOnlineForDatabase);
      userStatusFirestoreRef.set(isOnlineForFirestore);
    });
  });
}


// Use Vue.js to populate the UI with data
//
// Note: there is no special integration between Vue.js and Firebase, feel free
// to use any JavaScript framework you want in your own code!
const app = new Vue({
  el: "#app",
  data: {
    currentUser: null,
    onlineUsers: [],
    matchResponse: {},
    conversation: null,
    msgInput: "",
    emailInput: "robbin@smit.net",
    passwordInput: "password",
  },
  methods: {
    async match() {

      this.matchResponse = await match()
    },
    signUp: async function () {
      console.log("Attempting sign up as", this.emailInput);
      try {
        const user = await auth.createUserWithEmailAndPassword(this.emailInput, this.passwordInput);
        this.setUser(user);
      } catch (e) {
        console.warn(e);
      }
    },
    signIn: async function () {
      console.log("Attempting sign in as", this.emailInput);
      try {
        const user = await auth.signInWithEmailAndPassword(this.emailInput, this.passwordInput);
        this.setUser(user);
      } catch (e) {
        console.warn(e);
      }
    },
    setUser: function (user) {
      this.currentUser = user;
      if (user != null) {
        console.log("Signed in as ", user);

        detectPresence()

        // Update online users
        firestore.collection("status")
          .onSnapshot((snap) => {
            this.onlineUsers = snap.docs.map(doc => ({
              uid: doc.id,
              ...doc.data()
            })).filter(user => user.state === 'online')
          })
        firestore.collection("conversations")
          .doc(user.uid)
          .onSnapshot(snap => {
            if (snap.exists) {
              this.conversation = snap.data()
            } else {
              this.conversation = null
            }
          })
      }
    }
  },
  computed: {
    signedIn: function () {
      return this.currentUser !== null;
    }
  },
  created: function () {
    // Listen to auth state
    this.setUser(auth.currentUser);
    auth.onAuthStateChanged((user) => {
      this.setUser(user);
    });


  },
});
