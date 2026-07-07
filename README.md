# Tic-Tac-Toe — Play Remotely

A real-time, two-player tic-tac-toe game. One person creates a room and
gets a short code; the other enters that code to join. Moves sync
instantly between both screens over the internet — no app install, no
account for players.

It's built as plain HTML/CSS/JS with **Firebase Realtime Database** as
the sync layer, and it can be hosted for free.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure (lobby + game screen) |
| `style.css` | All styling |
| `app.js` | Game logic and Firebase sync |
| `firebase-config.js` | **You edit this** — your Firebase project keys |
| `database.rules.json` | Realtime Database security rules |

## 1. Create a free Firebase project (~5 minutes)

1. Go to **console.firebase.google.com** and click **Add project**.
   The free "Spark" plan is enough for this — no credit card needed.
2. In the left sidebar, go to **Build → Realtime Database → Create Database**.
   Pick any region and start in locked/test mode (you'll set proper rules next).
3. Click the **Rules** tab of the Realtime Database and paste in the
   contents of `database.rules.json` from this project, then click **Publish**.
4. Click the gear icon (top-left) → **Project settings**.
5. Under **Your apps**, click the **web icon (`</>`)** to register a
   web app (any nickname works). You don't need Firebase Hosting checked
   unless you plan to use it in step 3 below.
6. Firebase will show a `firebaseConfig` object with values like
   `apiKey`, `authDomain`, `databaseURL`, etc. Copy each value into the
   matching field in `firebase-config.js`.

These config values aren't secret — they just tell the browser which
project to talk to. Who can actually read/write your data is controlled
by the rules from step 3.

## 2. Test it locally (optional)

Because the game uses JS modules, opening `index.html` directly by
double-clicking it won't work in every browser. Serve the folder instead:

```bash
# from inside the project folder
python3 -m http.server 8080
# then open http://localhost:8080
```

Open that URL in two different browser tabs to simulate two players —
create a room in one tab, join with the code in the other.

## 3. Deploy it for free

Any static hosting works, since there's no backend server to run. Pick one:

**Firebase Hosting** (nice since you already have a Firebase project):
```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # choose your project, set public dir to "." 
firebase deploy
```

**Netlify** — go to app.netlify.com/drop and drag the project folder in.

**GitHub Pages** — push the folder to a GitHub repo, then enable Pages
in the repo's Settings → Pages.

**Cloudflare Pages / Vercel** — both have a free tier and a similar
"connect a repo, deploy" flow.

Whichever you pick, you'll get a public URL. Send that URL to the
person you want to play with.

## How it works

- A room is a small record in the Realtime Database: the board, whose
  turn it is, who's playing X/O, and the game status.
- Both browsers subscribe to that record, so any move one player makes
  is pushed to the other in real time.
- Room codes are 5 characters (letters/numbers, no confusing 0/O/1/I).
- If someone closes the tab and reopens the same room link, the game
  detects them as the original player and lets them rejoin — the
  opponent sees "they appear to be offline" in the meantime.
- After a win or draw, both players can request a rematch; the board
  resets once both have agreed.

## Notes on limits

- The free Firebase Spark plan comfortably handles a small game like
  this — you'd need a very large number of concurrent games before
  hitting any limit.
- The database rules keep things simple (anyone with a room code can
  read/write that room, nothing else) — fine for a casual game between
  friends. Old/abandoned rooms just sit there harmlessly; if you want,
  you can periodically clear them from the Firebase console's Realtime
  Database viewer.
- Want to customize colors or fonts? Everything is driven by the CSS
  variables at the top of `style.css`.
