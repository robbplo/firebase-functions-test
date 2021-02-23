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
  apiKey: "fakeApiKey"
});
debugger

const db = firebase.firestore();
const auth = firebase.auth();
const functions = firebase.functions();

auth.useEmulator("http://localhost:9099");
functions.useEmulator("localhost", 5001)
db.useEmulator("localhost", 8080);


const enterQueue = functions.httpsCallable('enterQueue');

// Use Vue.js to populate the UI with data
//
// Note: there is no special integration between Vue.js and Firebase, feel free
// to use any JavaScript framework you want in your own code!
const app = new Vue({
  el: "#app",
  data: {
    currentUser: null,
    queue: [],
    msgInput: "",
    emailInput: "robbin@smit.net",
    passwordInput: "password",
  },
  methods: {
    async enterQueue() {
      console.log(await enterQueue({ma:'nd'}));
    },
    signUp: async function() {
      console.log("Attempting sign up as", this.emailInput);
      try {
        const user = await auth.createUserWithEmailAndPassword(this.emailInput, this.passwordInput);
        this.setUser(user);
      } catch (e) {
        console.warn(e);
      }
    },
    signIn: async function() {
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

        // Listen to the queue collection
        db.collection("queue")
          .onSnapshot((snap) => {
            console.log("Got data from firestore!");
            this.queue = snap.docs.map((doc) => doc.data());
          });
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
