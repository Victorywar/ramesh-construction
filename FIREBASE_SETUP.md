# Firebase Setup

1. Create a Firebase project and register a Web app. Enable **Authentication > Email/Password** and create the Firestore database. This setup does not use Firebase Storage.
2. Copy `.env.example` to `.env.local` and fill in the Web app config values from **Project settings > General > Your apps**. These are public client identifiers; never put service-account credentials in Vite variables.
3. Install the Firebase CLI, run `firebase login`, then run `firebase use --add` to select this project. Deploy `firestore.rules` and `firestore.indexes.json` with `firebase deploy --only firestore`. The rules allow public portfolio reads, pending review/inquiry creation, and admin-only moderation, lead reads, project writes, and deletes.
4. Create the administrator as a Firebase Authentication user. Set the `admin: true` custom claim for that user's UID from a trusted environment using the Firebase Admin SDK. Do not set claims from the browser or expose a service-account key.

Example trusted Node.js setup (run outside this Vite app with `firebase-admin` installed and service-account JSON supplied securely through `FIREBASE_SERVICE_ACCOUNT`):

```js
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
await getAuth().setCustomUserClaims("FIREBASE_AUTH_UID", { admin: true });
```

Restart the Vite server after changing `.env.local`. The first authorized admin sign-in copies the current starter portfolio and approved testimonials into Firestore once. Later project and review changes are live across clients. Visitor reviews are stored as `pending`; only approved reviews are read by public clients. Uploaded project and handover photos are resized, JPEG-compressed in the browser canvas, and stored as base64 data URLs in their Firestore documents. The compressed image payload is capped at about 700 KiB to stay below Firestore's 1 MiB document limit. Leads are stored in `inquiries` and visible in the Admin Terminal.

The client-side admin login now uses Firebase Authentication. The previous hard-coded demo credentials are no longer valid.