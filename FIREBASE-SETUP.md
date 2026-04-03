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

3. For production, use proper security rules (example):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to gameSessions
    match /gameSessions/{sessionId} {
      allow read, write: if true; // Adjust based on your needs
    }
    
    // Allow read access to completedGames for leaderboards
    // Allow write access only from authenticated sources
    match /completedGames/{gameId} {
      allow read: if true;
      allow write: if request.auth != null; // Only authenticated users
    }
  }
}
```

4. Click "Publish" to apply the rules

## Step 6: Test the Setup

1. Open your game in a browser
2. Start a game session
3. Check Firebase Console > Firestore Database > Data tab
4. You should see:
   - A `gameSessions` collection with your session data
   - When you complete a game, a `completedGames` collection entry

## Step 7: Create Firestore Indexes (Required for Leaderboards)

Firestore requires composite indexes when you query with both `where` and `orderBy` on different fields. You need to create indexes for the leaderboard queries.

### Quick Method (Recommended):
1. When you click "Solo Leaderboard" or "Group Leaderboard" in the admin dashboard, you'll see an error with a link
2. **Click the link** in the error message - it will take you directly to Firebase Console
3. Click **"Create Index"** - Firebase will automatically create the required index
4. Wait 1-2 minutes for the index to build
5. Refresh the admin dashboard and try the leaderboard buttons again

### Manual Method:
1. Go to **Firestore Database** > **Indexes** tab in Firebase Console
2. Click **"Create Index"**
3. Create these two indexes:

   **Index 1: Solo Leaderboard**
   - Collection ID: `completedGames`
   - Fields to index:
     - `playerType` (Ascending)
     - `calculatedScore` (Descending)
   - Query scope: Collection

   **Index 2: Group Leaderboard**
   - Collection ID: `completedGames`
   - Fields to index:
     - `playerType` (Ascending)
     - `calculatedScore` (Descending)
   - Query scope: Collection

4. Click **"Create"** and wait for indexes to build (1-2 minutes)

**Note**: Indexes are free and only count toward your Firestore quota when they're building. Once built, they don't consume resources.

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
