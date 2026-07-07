// ---------------------------------------------------------------
// Paste your own Firebase project's config below.
//
// How to get it:
//   1. Go to https://console.firebase.google.com and create a
//      free project.
//   2. In the left sidebar: Build > Realtime Database > Create
//      Database (any region is fine).
//   3. Click the gear icon (top-left) > Project settings.
//   4. Under "Your apps", click the web icon (</>) to register
//      a web app (any nickname is fine, no need to check the
//      Firebase Hosting box unless you want to use it).
//   5. Firebase shows you a firebaseConfig object — copy each
//      value into the matching field below.
//
// These values are not secret — they identify your project so
// the browser knows where to send requests. Access to your data
// is controlled separately by the rules in database.rules.json.
// ---------------------------------------------------------------

<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyBU5haR7-p45DnaKqIFf4l1LM6xcXX30Y0",
    authDomain: "tictacktoe-5ce32.firebaseapp.com",
    databaseURL: "https://tictacktoe-5ce32-default-rtdb.firebaseio.com",
    projectId: "tictacktoe-5ce32",
    storageBucket: "tictacktoe-5ce32.firebasestorage.app",
    messagingSenderId: "209499752747",
    appId: "1:209499752747:web:531185c5429d9fa2d8dd6e",
    measurementId: "G-Q7ELGWXRG0"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
