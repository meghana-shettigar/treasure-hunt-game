// =============================================================================
// SINGLE SOURCE OF TRUTH for Firestore — all site features use this file only
// =============================================================================
// Whatever project is in the active `firebaseConfig` below is used for:
//   • booking.html          — new bookings, payments metadata
//   • game.html + database.js — game sessions, progress, access checks
//   • admin-dashboard.html    — admin list/edit, game links
//   • feedback-stats.html     — feedback submissions
//
// There are no other Firestore project IDs in the codebase. Update this file
// once to switch the entire deployed site to a new database (e.g. fresh prod).
//
// New production project = empty collections until real users use the site.
// Copy security rules + composite indexes from FIREBASE-SETUP.md (same as test).
//
// Get web app config: https://console.firebase.google.com/ → Project settings → Your apps
// Authorized domains: Authentication → Settings → Authorized domains
//   (add letterleftbehind.com, www.letterleftbehind.com, localhost)
// =============================================================================

// --- TEST / staging Firestore (same structure as prod; use for non-production deploys) ---
// var firebaseConfig = {
//     apiKey: "AIzaSyA44AD7ZKLVRj5uZW6WfrOVQjESCTZeB5w",
//     authDomain: "treasure-hunt-game-4bd4c.firebaseapp.com",
//     projectId: "treasure-hunt-game-4bd4c",
//     storageBucket: "treasure-hunt-game-4bd4c.firebasestorage.app",
//     messagingSenderId: "759870454332",
//     appId: "1:759870454332:web:350b1cb12a744ca2c4e139"
// };

// --- Production (active): paste the NEW clean production project config here ---
var firebaseConfig = {
    apiKey: "AIzaSyACJ8-qrF1Eh2AkumWU5Aoj0n_ui4F4jU4",
    authDomain: "letterleftbehind-a2300.firebaseapp.com",
    projectId: "letterleftbehind-a2300",
    storageBucket: "letterleftbehind-a2300.firebasestorage.app",
    messagingSenderId: "549788284446",
    appId: "1:549788284446:web:e1e08ad6e4355f763a600f"
};
