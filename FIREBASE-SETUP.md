# Firebase Setup Instructions

This guide will help you set up Firebase Firestore for the Treasure Hunt game database.

## Production: clean database vs test (two projects)

For **real customers**, create a **separate Firebase project** (or use a dedicated production project) so Firestore starts **empty**—no test bookings, sessions, or feedback. Configure it **the same way** as test: enable Firestore in the same region you want long-term, then apply the **same security rules** and **composite indexes** described in this guide (same structure, not the same data).

**Where the app connects:** only [`firebase-config.js`](firebase-config.js). The active `var firebaseConfig = { ... }` sets `projectId` for the whole site. These pages all use it (via `database.js` where noted):

| Area | Files |
|------|--------|
| Bookings | `booking.html` |
| Game + saved state | `game.html`, `database.js` |
| Admin | `admin-dashboard.html` |
| Feedback stats | `feedback-stats.html` |

After you paste your **production** web config into `firebase-config.js` and deploy, every feature above reads and writes the **new** database. Keep the old test project’s config in the **commented** block in that file for a future staging/test deployment.

You do **not** need to change collection names or JavaScript in other files for a new project—only `firebase-config.js` and the Firebase Console (rules, indexes, authorized domains).

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter your project name (e.g., "treasure-hunt-game")
4. (Optional) Enable Google Analytics (not required)
5. Click "Create project"

## Step 2: Enable Firestore Database

1. In your Firebase project, go to **Build** > **Firestore Database**
2. Click "Create database"
3. **Select Edition**: Choose **"Standard edition"** (free tier)
   - Enterprise edition is paid - you don't need it for this project
4. Select "Start in test mode" (for development)
   - **Important**: For production, you'll need to set up proper security rules
5. Choose a location for your database:
   - **If the dropdown is empty**: Try refreshing the page, waiting a few seconds, or using a different browser
   - Select the closest region to your users (e.g., `us-central`, `europe-west`, `asia-southeast`)
   - Popular choices: `us-central` (Iowa), `europe-west` (Belgium), or `asia-southeast` (Singapore)
   - **Note**: The location cannot be changed later, so choose carefully
6. Click "Enable"

## Step 3: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click on the web icon (`</>`)
4. Register your app:
   - Enter app nickname (e.g., "Treasure Hunt Game")
   - (Optional) Check "Also set up Firebase Hosting"
   - Click "Register app"
5. When asked "Add Firebase SDK", choose **"Use a <script> tag"** (NOT npm)
   - This project uses script tags to load Firebase, not npm packages
6. Copy the Firebase configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## Step 4: Update firebase-config.js

1. Open `firebase-config.js` in your project
2. Replace the placeholder values with your actual Firebase config:

```javascript
var firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## Step 5: Set Up Firestore Security Rules (Important!)

1. Go to **Firestore Database** > **Rules** tab
2. For development, you can use these rules (allows read/write to anyone):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ Warning**: These rules allow anyone to read/write your database. This is only for development!

3. **Production / this app (required):** The site uses **no Firebase Authentication** on the client: booking, game, admin, and feedback all talk to Firestore with the public web config. If your rules **deny** reads on `bookings`, the booking form will fail when loading time slots with:

   `FirebaseError: Missing or insufficient permissions`

   Use rules that allow the collections below (same pattern as a locked-down “open client” app). **Tightening** later would mean adding Firebase Auth, Cloud Functions, or App Check—not `request.auth != null` on writes unless you add sign-in everywhere.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Booking flow: public read (slot queries) + create/update (checkout)
    match /bookings/{bookingId} {
      allow read, create, update: if true;
    }
    // Game sessions: create/read/update/delete (e.g. delete when completing)
    match /gameSessions/{sessionId} {
      allow read, write: if true;
    }
    // Leaderboards + completed runs
    match /completedGames/{gameId} {
      allow read, create: if true;
    }
    // Post-game feedback
    match /feedback/{feedbackId} {
      allow read, create: if true;
    }
  }
}
```

**Security note:** These rules match how the JavaScript is written today (open client). Anyone could theoretically call your Firestore API if they know your project ID; mitigations for a later phase include App Check, server-side writes, or auth. Do **not** use the old doc example that required `request.auth != null` for `completedGames` writes—the game would stop saving scores.

4. Click **Publish** to apply the rules

## Step 6: Test the Setup

1. Open your game in a browser
2. Start a game session
3. Check Firebase Console > Firestore Database > Data tab
4. You should see:
   - A `gameSessions` collection with your session data
   - When you complete a game, a `completedGames` collection entry

## Step 7: Create Firestore Composite Indexes

Firestore needs **composite** indexes when a query combines multiple `where` / `orderBy` fields. Your **production** project should define the same indexes your **test** project has (or you will see errors with links to create them).

### Why the old doc listed “two” `completedGames` indexes

**Solo** and **Group** leaderboards both run:

`where('playerType', '==', …)` + `orderBy('calculatedScore', 'desc')`

They differ only by the **value** of `playerType` (`'solo'` vs `'group'`). Firestore uses **one** composite index on the **fields** `playerType` + `calculatedScore`. You do **not** need two separate index rows for solo vs group—listing them twice in docs was redundant.

### Quick method (still recommended)

When a query is missing an index, the browser console (or Firebase) shows an error with a **direct link** to create that index. Use those links as you exercise each feature (booking date, admin dashboard sections, leaderboards, feedback page).

### Manual checklist — align prod with what the app queries

Create these in **Firestore Database → Indexes → Composite** (Collection scope = **Collection** unless noted):

| Collection | Fields (order) | Used by |
|------------|------------------|---------|
| **`completedGames`** | `playerType` ↑, `calculatedScore` ↓ | Solo & group leaderboards (`database.js`), admin “Solo/Group leaderboard” (`admin-dashboard.html`) |
| **`bookings`** | `date` ↑, `status` ↑ | Booking form: taken slots per date (`booking.html`) |
| **`bookings`** | `date` ↑, `time` ↑ | Admin: upcoming / past bookings list (`orderBy` date then time) |
| **`gameSessions`** | `gameStatus` ↑, `updatedAt` ↓ | Admin: **Active Game Sessions** (active only, sorted by recency) |
| **`feedback`** | `submittedAt` ↓ | `feedback-stats.html` (`orderBy('submittedAt', 'desc')`) — create if the console asks for it; single-field `orderBy` sometimes works without a manual composite depending on project defaults |

**Notes:**

- Admin **completed games** table (`orderBy('completedAt', 'desc')` only) often uses Firestore’s automatic single-field indexing; add a composite only if Firebase returns an index error for that query.
- Simple queries like `where('bookingId', '==', id)` on `gameSessions` use automatic single-field indexes—no extra composite row for those.

### Same as test?

Yes: **production should have the same composite indexes as test** for the same app version—otherwise the same screens will fail in prod with “missing index” errors. If test had **four** index rows, they likely correspond to the four distinct composite patterns above (two on **`bookings`**, one on **`completedGames`**, one on **`gameSessions`**, plus **`feedback`** if that query required it). Counts in the console can vary slightly if Firebase merged or auto-created single-field indexes.

**Note**: Indexes are free; only index build time uses extra quota briefly.

## Step 8: View Data in Tabular Format

You have two options to view your data in a table:

### Option 1: Firebase Console (Built-in)
1. Go to **Firestore Database** > **Data** tab in Firebase Console
2. Click on a collection (`gameSessions` or `completedGames`)
3. The data is displayed in a table format automatically
4. You can sort by clicking column headers

### Option 2: Admin Dashboard (Recommended)
1. Open `admin-dashboard.html` in your browser (same directory as your game)
2. The dashboard will automatically load and display:
   - **Active Game Sessions**: All in-progress games with details
   - **Completed Games**: All finished games with leaderboard rankings
3. Features:
   - 📊 Statistics cards (total sessions, solo/group counts, averages)
   - 🔄 Refresh buttons to reload data
   - ⭐ Leaderboard views (solo and group separately) - **Requires indexes (see Step 7)**
   - 📥 Export to CSV for Excel/Google Sheets
   - 📋 Sortable tables with all game data
4. Make sure `firebase-config.js` is configured for the dashboard to work

## Database Collections

### `gameSessions`
Stores active/in-progress game sessions. Each document represents a player's current game state.

**Document Fields:**
- `sessionId`: Unique session identifier
- `playerType`: "solo" or "group"
- `playerName`: Player or group name
- `groupMembers`: Array of group member names (empty for solo)
- `currentLocationIndex`: Current location (0 = starting point, 1-10 = locations)
- `score`: Current points/stars
- `startTime`: Game start timestamp
- `elapsedTime`: Elapsed time in seconds
- `isTimerRunning`: Boolean
- `isTimerPaused`: Boolean
- `pauseStartTime`: Timestamp when paused (if paused)
- `totalPauseTime`: Total paused time in milliseconds
- `completedLocations`: Array of completed locations
- `hintsUsed`: Object with `textHints` and `mapHints` arrays
- `answersSubmitted`: Array of location IDs with submitted answers
- `locationNamesSubmitted`: Array of location IDs with submitted location names
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### `completedGames`
Stores completed game results for leaderboards.

**Document Fields:**
- `sessionId`: Reference to game session
- `playerType`: "solo" or "group"
- `playerName`: Player or group name
- `groupMembers`: Array of group member names
- `finalScore`: Final points/stars
- `finalTime`: Final time in seconds
- `calculatedScore`: Calculated score for leaderboard (stars * 10 - time/10)
- `completedLocations`: Array of all completed locations
- `completedAt`: Completion timestamp

## Troubleshooting

### Database not saving?
1. Check browser console for errors
2. Verify Firebase config is correct
3. Check Firestore security rules allow writes
4. Verify Firestore is enabled in Firebase Console

### "Firebase not initialized" warning?
- Check that Firebase SDK is loaded before `database.js`
- Verify `firebase-config.js` is loaded before `database.js`
- Check browser console for initialization errors

### Firebase quota exceeded?
- Firebase free tier includes:
  - 50K reads/day
  - 20K writes/day
  - 20K deletes/day
- Monitor usage in Firebase Console > Usage and billing

## Next Steps

1. Set up proper security rules for production
2. Consider adding Firebase Authentication for user-specific data
3. Set up indexes for leaderboard queries (if needed)
4. Monitor database usage and costs

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Pricing](https://firebase.google.com/pricing)
