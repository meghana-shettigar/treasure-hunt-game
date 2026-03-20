// Main Application Logic - Handles UI interactions and screen management

let gameEngine;
// Audio/Music - COMMENTED OUT FOR NOW
// let backgroundMusic;
// let isMusicPlaying = false;
let currentPlayerType = 'solo'; // Track current player type (solo/group)
let saveStateInterval = null; // Interval for auto-saving game state
let waitingForGameplayStart = false; // Flag to track if we're waiting to start gameplay after character message

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Firebase
    if (window.DatabaseService) {
        window.DatabaseService.initializeFirebase();
    }
    
    gameEngine = new GameEngine();
    
    // Initialize background music - COMMENTED OUT FOR NOW
    // backgroundMusic = document.getElementById('background-music');
    // if (backgroundMusic) {
    //     backgroundMusic.volume = 0.3; // Set volume to 30%
    // }
    
    // Set up callbacks
    gameEngine.onTimerUpdate = (time) => {
        updateTimerDisplay(time);
    };
    
    gameEngine.onScoreUpdate = (score) => {
        updateScoreDisplay(score);
    };
    
    // Set current year in final screen
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Set up event listeners first (before any DOM modifications)
    setupEventListeners();
    
    // Check for booking-based access
    await checkBookingAccess();
    
    // Check for saved game state and resume if available
    await checkForSavedGame();
    
    // Auto-save game state every 30 seconds (only when game is running)
    startAutoSave();
});

// Get URL parameter
function getURLParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Get session ID (helper function)
function getSessionId() {
    if (window.DatabaseService && typeof window.DatabaseService.getSessionId === 'function') {
        return window.DatabaseService.getSessionId();
    }
    // Fallback to localStorage
    return localStorage.getItem('gameSessionId');
}

// Check booking-based access
async function checkBookingAccess() {
    const bookingId = getURLParameter('bookingId');
    
    if (!bookingId) {
        // No booking ID - allow normal game flow (for testing/development)
        return;
    }
    
    if (!window.DatabaseService || !window.DatabaseService.isInitialized()) {
        console.warn('Database not initialized. Cannot check booking access.');
        return;
    }
    
    try {
        // Check if we can access the game
        const accessCheck = await window.DatabaseService.canAccessGame(bookingId);
        
        // If access denied because session not found, try to create session from booking
        if (!accessCheck.canAccess && accessCheck.reason === 'Game session not found') {
            try {
                // Try to get booking data to create session
                const dbRef = window.DatabaseService.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
                if (dbRef) {
                    const bookingDoc = await dbRef.collection('bookings').doc(bookingId).get();
                    const docExists = typeof bookingDoc.exists === 'function' ? bookingDoc.exists() : bookingDoc.exists;
                    if (docExists) {
                        const bookingData = bookingDoc.data();
                        // Create game session from booking
                        const sessionId = await window.DatabaseService.createGameSessionFromBooking(bookingId, bookingData);
                        if (sessionId) {
                            // Reload access check to get the newly created session
                            const newAccessCheck = await window.DatabaseService.canAccessGame(bookingId);
                            if (newAccessCheck.canAccess && newAccessCheck.gameSession) {
                                // Update accessCheck with new values
                                accessCheck = newAccessCheck;
                            } else {
                                // Still can't access even after creating session
                                const welcomeScreen = document.getElementById('welcome-screen');
                                if (welcomeScreen) {
                                    welcomeScreen.innerHTML = `
                                        <div class="welcome-container">
                                            <h1 class="game-title">Access Restricted</h1>
                                            <p class="game-subtitle" style="color: var(--accent-color); margin-top: 20px;">
                                                ${newAccessCheck.reason || 'You cannot access this game at this time.'}
                                            </p>
                                            <p style="margin-top: 20px; color: #666;">
                                                If you believe this is an error, please contact support.
                                            </p>
                                        </div>
                                    `;
                                }
                                return;
                            }
                        } else {
                            // Couldn't create session
                            const welcomeScreen = document.getElementById('welcome-screen');
                            if (welcomeScreen) {
                                welcomeScreen.innerHTML = `
                                    <div class="welcome-container">
                                        <h1 class="game-title">Access Restricted</h1>
                                        <p class="game-subtitle" style="color: var(--accent-color); margin-top: 20px;">
                                            Unable to create game session. Please contact support.
                                        </p>
                                        <p style="margin-top: 20px; color: #666;">
                                            If you believe this is an error, please contact support.
                                        </p>
                                    </div>
                                `;
                            }
                            return;
                        }
                    } else {
                        // Booking doesn't exist
                        const welcomeScreen = document.getElementById('welcome-screen');
                        if (welcomeScreen) {
                            welcomeScreen.innerHTML = `
                                <div class="welcome-container">
                                    <h1 class="game-title">Access Restricted</h1>
                                    <p class="game-subtitle" style="color: var(--accent-color); margin-top: 20px;">
                                        Booking not found. Please check your booking link.
                                    </p>
                                    <p style="margin-top: 20px; color: #666;">
                                        If you believe this is an error, please contact support.
                                    </p>
                                </div>
                            `;
                        }
                        return;
                    }
                }
            } catch (error) {
                console.error('Error creating game session:', error);
                const welcomeScreen = document.getElementById('welcome-screen');
                if (welcomeScreen) {
                    welcomeScreen.innerHTML = `
                        <div class="welcome-container">
                            <h1 class="game-title">Access Restricted</h1>
                            <p class="game-subtitle" style="color: var(--accent-color); margin-top: 20px;">
                                Error accessing game. Please try again or contact support.
                            </p>
                            <p style="margin-top: 20px; color: #666;">
                                If you believe this is an error, please contact support.
                            </p>
                        </div>
                    `;
                }
                return;
            }
        }
        
        if (!accessCheck.canAccess) {
            // Show access denied message for other reasons
            const welcomeScreen = document.getElementById('welcome-screen');
            if (welcomeScreen) {
                welcomeScreen.innerHTML = `
                    <div class="welcome-container">
                        <h1 class="game-title">Access Restricted</h1>
                        <p class="game-subtitle" style="color: var(--accent-color); margin-top: 20px;">
                            ${accessCheck.reason || 'You cannot access this game at this time.'}
                        </p>
                        <p style="margin-top: 20px; color: #666;">
                            If you believe this is an error, please contact support.
                        </p>
                    </div>
                `;
            }
            return;
        }
        
        // Access granted - load or create game session
        let gameSession = accessCheck.gameSession;
        
        // If no session exists but access is granted, try to create one from booking
        if (!gameSession && accessCheck.canAccess) {
            try {
                // Try to get booking data to create session
                const dbRef = window.DatabaseService.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
                if (dbRef) {
                    const bookingDoc = await dbRef.collection('bookings').doc(bookingId).get();
                    const docExists = typeof bookingDoc.exists === 'function' ? bookingDoc.exists() : bookingDoc.exists;
                    if (docExists) {
                        const bookingData = bookingDoc.data();
                        // Create game session from booking
                        const sessionId = await window.DatabaseService.createGameSessionFromBooking(bookingId, bookingData);
                        if (sessionId) {
                            // Reload access check to get the newly created session
                            const newAccessCheck = await window.DatabaseService.canAccessGame(bookingId);
                            if (newAccessCheck.gameSession) {
                                gameSession = newAccessCheck.gameSession;
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error creating game session:', error);
            }
        }
        
        if (gameSession) {
            // IMPORTANT: Set session ID so loadGameState can find it
            if (window.DatabaseService && typeof window.DatabaseService.setSessionId === 'function') {
                window.DatabaseService.setSessionId(gameSession.id || gameSession.sessionId);
            }
            
            // Set booking info in game engine
            gameEngine.bookingId = bookingId;
            gameEngine.bookingDate = gameSession.bookingDate;
            gameEngine.bookingTime = gameSession.bookingTime;
            gameEngine.gameStatus = gameSession.gameStatus || 'pending';
            
            // Get booking data to auto-detect solo/group
            try {
                const dbRef = window.DatabaseService.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
                if (dbRef) {
                    const bookingDoc = await dbRef.collection('bookings').doc(bookingId).get();
                    const docExists = typeof bookingDoc.exists === 'function' ? bookingDoc.exists() : bookingDoc.exists;
                    if (docExists) {
                        const bookingData = bookingDoc.data();
                        // Auto-set solo/group based on booking
                        const numPlayers = parseInt(bookingData.players) || 1;
                        const groupSizeEl = document.getElementById('group-size');
                        const playerSetupLabel = document.querySelector('.player-setup label[for="group-size"]');
                        
                        if (groupSizeEl) {
                            if (numPlayers > 1) {
                                groupSizeEl.value = 'group';
                                groupSizeEl.style.display = 'none'; // Hide selector
                                if (playerSetupLabel) {
                                    playerSetupLabel.textContent = 'Playing as: Group Adventure';
                                    playerSetupLabel.style.marginBottom = '15px';
                                }
                            } else {
                                groupSizeEl.value = 'solo';
                                groupSizeEl.style.display = 'none'; // Hide selector
                                if (playerSetupLabel) {
                                    playerSetupLabel.textContent = 'Playing as: Solo Explorer';
                                    playerSetupLabel.style.marginBottom = '15px';
                                }
                            }
                            // Trigger change event to update UI
                            groupSizeEl.dispatchEvent(new Event('change'));
                        }
                    }
                }
            } catch (error) {
                console.error('Error getting booking data:', error);
            }
            
            // DO NOT restore state here - each player should start fresh
            // State restoration only happens in checkForSavedGame() for the player's own session
        } else if (accessCheck.canAccess) {
            // Access is granted but no session found and couldn't create one
            console.warn('Access granted but no game session found for bookingId:', bookingId);
        }
    } catch (error) {
        console.error('Error checking booking access:', error);
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Welcome screen - check if elements exist before adding listeners
    const groupSizeEl = document.getElementById('group-size');
    if (groupSizeEl) {
        groupSizeEl.addEventListener('change', (e) => {
            updateNameLabel(e.target.value);
        });
    }
    
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) startGameBtn.addEventListener('click', startGame);
    
    const resumeBtn = document.getElementById('resume-previous-game-btn');
    if (resumeBtn) resumeBtn.addEventListener('click', showResumeGameModal);
    
    const viewTutorialBtn = document.getElementById('view-tutorial-btn');
    if (viewTutorialBtn) viewTutorialBtn.addEventListener('click', showTutorial);
    
    const startAfterTutorialBtn = document.getElementById('start-after-tutorial-btn');
    if (startAfterTutorialBtn) startAfterTutorialBtn.addEventListener('click', startAfterTutorial);
    
    // Resume game modal
    const closeResumeModal = document.getElementById('close-resume-modal');
    if (closeResumeModal) closeResumeModal.addEventListener('click', closeResumeGameModal);
    
    const searchSavedGamesBtn = document.getElementById('search-saved-games-btn');
    if (searchSavedGamesBtn) searchSavedGamesBtn.addEventListener('click', searchSavedGames);
    
    const resumePlayerName = document.getElementById('resume-player-name');
    if (resumePlayerName) {
        resumePlayerName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchSavedGames();
            }
        });
    }
    
    // Starting point screen
    const arrivedBtn = document.getElementById('arrived-btn');
    if (arrivedBtn) arrivedBtn.addEventListener('click', startGameplay);
    
    // Game screen
    const submitLocationNameBtn = document.getElementById('submit-location-name-btn');
    if (submitLocationNameBtn) submitLocationNameBtn.addEventListener('click', handleSubmitLocationName);
    
    const locationNameInput = document.getElementById('location-name-input');
    if (locationNameInput) {
        locationNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSubmitLocationName();
            }
        });
    }
    
    const viewTitbitsBtn = document.getElementById('view-titbits-btn');
    if (viewTitbitsBtn) viewTitbitsBtn.addEventListener('click', showTitbits);
    
    const textHintBtn = document.getElementById('text-hint-btn');
    if (textHintBtn) textHintBtn.addEventListener('click', showTextHint);
    
    const mapHintBtn = document.getElementById('map-hint-btn');
    if (mapHintBtn) mapHintBtn.addEventListener('click', showMapHint);
    
    const submitAnswerBtn = document.getElementById('submit-answer-btn');
    if (submitAnswerBtn) submitAnswerBtn.addEventListener('click', submitAnswer);
    
    const answerInput = document.getElementById('answer-input');
    if (answerInput) {
        answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitAnswer();
            }
        });
    }
    
    const toggleLocationsPanelBtn = document.getElementById('toggle-locations-panel-btn');
    if (toggleLocationsPanelBtn) toggleLocationsPanelBtn.addEventListener('click', toggleLocationsPanel);
    
    // Music toggle - COMMENTED OUT FOR NOW
    // document.getElementById('music-toggle-btn').addEventListener('click', toggleMusic);
    
    // Titbits screen
    const closeTitbitsBtn = document.getElementById('close-titbits-btn');
    if (closeTitbitsBtn) closeTitbitsBtn.addEventListener('click', closeTitbits);
    
    // Hint modal
    const closeHintModalBtn = document.getElementById('close-hint-modal');
    if (closeHintModalBtn) closeHintModalBtn.addEventListener('click', closeHintModal);
    
    // Feedback modal
    const closeFeedbackModalBtn = document.getElementById('close-feedback-modal');
    if (closeFeedbackModalBtn) closeFeedbackModalBtn.addEventListener('click', closeFeedbackModal);
    
    // Final screen
    document.getElementById('give-feedback-btn').addEventListener('click', showFeedbackModal);
    document.getElementById('share-results-btn').addEventListener('click', shareResults);
    
    // Feedback form
    document.getElementById('feedback-form').addEventListener('submit', handleFeedbackSubmit);
    document.getElementById('close-feedback-form-btn').addEventListener('click', closeFeedbackModal);
    document.getElementById('close-feedback-after-submit').addEventListener('click', closeFeedbackModal);
    
    // Character modals
    document.getElementById('close-character-intro-btn').addEventListener('click', closeCharacterIntro);
    document.getElementById('close-character-popup-btn').addEventListener('click', closeCharacterPopup);
    const closeCharacterPopupXBtn = document.getElementById('close-character-popup-x-btn');
    if (closeCharacterPopupXBtn) {
        closeCharacterPopupXBtn.addEventListener('click', closeCharacterPopup);
    }
    
    // Support popup
    const helpSupportBtn = document.getElementById('help-support-btn');
    if (helpSupportBtn) {
        helpSupportBtn.addEventListener('click', showSupportPopup);
    }
    const closeSupportPopupBtn = document.getElementById('close-support-popup-btn');
    if (closeSupportPopupBtn) {
        closeSupportPopupBtn.addEventListener('click', closeSupportPopup);
    }
    
    // Setup rating buttons
    setupRatingButtons();
}

// Update name label based on group size
function updateNameLabel(groupSize) {
    const soloContainer = document.getElementById('solo-name-container');
    const groupContainer = document.getElementById('group-name-container');
    
    if (groupSize === 'group') {
        if (soloContainer) soloContainer.style.display = 'none';
        if (groupContainer) groupContainer.style.display = 'block';
    } else {
        if (soloContainer) soloContainer.style.display = 'block';
        if (groupContainer) groupContainer.style.display = 'none';
    }
}

// Toggle background music - COMMENTED OUT FOR NOW
/*
function toggleMusic() {
    const musicBtn = document.getElementById('music-toggle-btn');
    const musicIcon = document.getElementById('music-icon');
    
    if (isMusicPlaying) {
        backgroundMusic.pause();
        musicIcon.textContent = '🎵';
        musicBtn.classList.remove('playing');
        isMusicPlaying = false;
    } else {
        backgroundMusic.play().catch(error => {
            console.log('Music autoplay prevented:', error);
            // User interaction is required for audio playback
        });
        musicIcon.textContent = '🔊';
        musicBtn.classList.add('playing');
        isMusicPlaying = true;
    }
}
*/

// Show tutorial screen
function showTutorial() {
    showScreen('tutorial-screen');
}

// Start game after tutorial
function startAfterTutorial() {
    showScreen('welcome-screen');
}

// Start game from welcome screen
async function startGame() {
    const bookingId = getURLParameter('bookingId');
    let groupSize = document.getElementById('group-size').value;
    
    // For booking-based games, auto-detect solo/group from booking data
    if (bookingId && window.DatabaseService && window.DatabaseService.isInitialized()) {
        try {
            const dbRef = window.DatabaseService.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
            if (dbRef) {
                const bookingDoc = await dbRef.collection('bookings').doc(bookingId).get();
                const docExists = typeof bookingDoc.exists === 'function' ? bookingDoc.exists() : bookingDoc.exists;
                if (docExists) {
                    const bookingData = bookingDoc.data();
                    const numPlayers = parseInt(bookingData.players) || 1;
                    // Auto-set group size based on booking
                    groupSize = numPlayers > 1 ? 'group' : 'solo';
                }
            }
        } catch (error) {
            console.error('Error getting booking data for group size:', error);
            // Fall back to selected value
        }
    }
    
    let playerName, teamName;
    
    if (groupSize === 'group') {
        teamName = document.getElementById('team-name').value.trim();
        playerName = document.getElementById('player-name-group').value.trim();
        
        if (!teamName) {
            alert('Please enter your team name to begin.');
            return;
        }
        
        if (!playerName) {
            alert('Please enter your name to begin.');
            return;
        }
    } else {
        playerName = document.getElementById('player-name').value.trim();
        
        if (!playerName) {
            alert('Please enter your name to begin.');
            return;
        }
    }
    let allPlayerNames = [playerName]; // Start with current player's name
    
    // If booking-based game, check access first
    if (bookingId && window.DatabaseService && window.DatabaseService.isInitialized()) {
        const accessCheck = await window.DatabaseService.canAccessGame(bookingId);
        
        if (!accessCheck.canAccess) {
            alert(accessCheck.reason || 'You cannot start this game at this time.');
            return;
        }
        
        // Get booking data to create a NEW session for this player
        // Each player should get their own session, even with the same booking link
        try {
            const dbRef = window.DatabaseService.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
            if (dbRef) {
                const bookingDoc = await dbRef.collection('bookings').doc(bookingId).get();
                const docExists = typeof bookingDoc.exists === 'function' ? bookingDoc.exists() : bookingDoc.exists;
                if (docExists) {
                    const bookingData = bookingDoc.data();
                    // Create a NEW session for this player (each player gets their own session)
                    const sessionId = await window.DatabaseService.createGameSessionFromBooking(bookingId, bookingData);
                    if (sessionId) {
                        // Set the new session ID
                        if (window.DatabaseService.setSessionId) {
                            window.DatabaseService.setSessionId(sessionId);
                        }
                        // Get the newly created session
                        const newAccessCheck = await window.DatabaseService.canAccessGame(bookingId, sessionId);
                        const gameSession = newAccessCheck.gameSession;
                        if (gameSession) {
                            gameEngine.bookingId = bookingId;
                            gameEngine.bookingDate = gameSession.bookingDate;
                            gameEngine.bookingTime = gameSession.bookingTime;
                            gameEngine.gameStatus = 'active';
                        } else {
                            gameEngine.bookingId = bookingId;
                            gameEngine.gameStatus = 'active';
                        }
                    } else {
                        // Fallback if session creation fails
                        gameEngine.bookingId = bookingId;
                        gameEngine.gameStatus = 'active';
                    }
                } else {
                    gameEngine.bookingId = bookingId;
                    gameEngine.gameStatus = 'active';
                }
            } else {
                gameEngine.bookingId = bookingId;
                gameEngine.gameStatus = 'active';
            }
        } catch (error) {
            console.error('Error creating game session:', error);
            // Fallback
            gameEngine.bookingId = bookingId;
            gameEngine.gameStatus = 'active';
        }
        
        // For group games, fetch all player names from sessions with same bookingId/time slot
        if (groupSize === 'group' && bookingId) {
            try {
                const allPlayerNamesList = await fetchAllPlayerNamesForBooking(bookingId, teamName);
                if (allPlayerNamesList && allPlayerNamesList.length > 0) {
                    allPlayerNames = allPlayerNamesList;
                }
            } catch (error) {
                console.error('Error fetching player names:', error);
                // Continue with just current player's name
            }
        }
    } else {
        // Non-booking game (for testing/development)
        // Create a new game session for non-booking games
        if (window.DatabaseService && window.DatabaseService.isInitialized()) {
            // Generate a new session ID for non-booking games
            const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            if (window.DatabaseService.setSessionId) {
                window.DatabaseService.setSessionId(sessionId);
            }
            // Set game status to active for non-booking games
            gameEngine.gameStatus = 'active';
        }
    }
    
    // Store player type
    currentPlayerType = groupSize;
    
    // For group games, use team name as playerName and store all names as groupMembers
    const finalPlayerName = groupSize === 'group' ? teamName : playerName;
    
    // Initialize game engine with team name (for group) or player name (for solo)
    // groupMembers will be updated after we fetch all names
    gameEngine.initialize(finalPlayerName, groupSize, '', null);
    
    // Store individual player name for both solo and group games (needed for Archibald to reference the actual player)
    gameEngine.individualPlayerName = playerName;
    
    // Store team name for group games (for admin dashboard)
    if (groupSize === 'group') {
        gameEngine.teamName = teamName;
    } else {
        gameEngine.teamName = null; // No team name for solo players
    }
    
    // For group games, fetch and update all player names
    if (groupSize === 'group' && bookingId && window.DatabaseService) {
        try {
            const allNames = await fetchAllPlayerNamesForBooking(bookingId, teamName, playerName);
            if (allNames && allNames.length > 0) {
                gameEngine.groupMembers = allNames;
            } else {
                // If no other players found yet, start with current player
                gameEngine.groupMembers = [playerName];
            }
        } catch (error) {
            console.error('Error fetching player names:', error);
            gameEngine.groupMembers = [playerName];
        }
        
        // Save game state with updated group members
        await saveGameState();
    }
    
    // Update score display to show initial 100 points
    updateScoreDisplay(gameEngine.getScore());
    
    // Show character introduction first
    showCharacterIntroduction(finalPlayerName, groupSize);
}

// Fetch all player names from sessions with same bookingId and time slot
async function fetchAllPlayerNamesForBooking(bookingId, teamName, currentPlayerName) {
    if (!window.DatabaseService || !window.DatabaseService.isInitialized()) {
        return null;
    }
    
    try {
        // Get db reference
        const db = window.DatabaseService.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
        if (!db) {
            return null;
        }
        
        // Find all game sessions for this booking
        const sessionsSnapshot = await db.collection('gameSessions')
            .where('bookingId', '==', bookingId)
            .get();
        
        const playerNamesSet = new Set();
        const teamNamesMap = new Map(); // Map to track team names (case-insensitive)
        
        // Collect all individual player names and team names
        sessionsSnapshot.forEach(doc => {
            const sessionData = doc.data();
            
            if (sessionData.playerType === 'group') {
                // For group games, playerName is the team name
                const sessionTeamName = sessionData.playerName;
                if (sessionTeamName) {
                    const teamNameLower = sessionTeamName.toLowerCase().trim();
                    // Store team name (case-insensitive key)
                    if (!teamNamesMap.has(teamNameLower)) {
                        teamNamesMap.set(teamNameLower, sessionTeamName);
                    }
                }
                
                // Get individual player names
                if (sessionData.individualPlayerName) {
                    playerNamesSet.add(sessionData.individualPlayerName.trim());
                }
                
                // Also check groupMembers (for backward compatibility)
                if (sessionData.groupMembers) {
                    if (Array.isArray(sessionData.groupMembers)) {
                        sessionData.groupMembers.forEach(name => {
                            if (name && name.trim()) {
                                playerNamesSet.add(name.trim());
                            }
                        });
                    } else if (typeof sessionData.groupMembers === 'string') {
                        // Handle comma-separated string
                        sessionData.groupMembers.split(',').forEach(name => {
                            const trimmed = name.trim();
                            if (trimmed) {
                                playerNamesSet.add(trimmed);
                            }
                        });
                    }
                }
            }
        });
        
        // Add current player's name
        if (currentPlayerName) {
            playerNamesSet.add(currentPlayerName.trim());
        }
        
        // If team names differ (case-insensitive), select one based on time slot
        // Since only one group plays per slot, use the first one found or current one
        if (teamNamesMap.size > 0) {
            const teamNameLower = teamName.toLowerCase().trim();
            // Check if current team name matches any existing (case-insensitive)
            let matchingTeamName = null;
            for (const [lowerName, originalName] of teamNamesMap.entries()) {
                if (lowerName === teamNameLower) {
                    matchingTeamName = originalName;
                    break;
                }
            }
            
            // Use matching team name or first one found (for consistency)
            const selectedTeamName = matchingTeamName || Array.from(teamNamesMap.values())[0];
            
            // Update gameEngine's playerName to use the selected team name (for consistency)
            if (gameEngine && gameEngine.bookingId === bookingId) {
                gameEngine.playerName = selectedTeamName;
            }
        }
        
        // Return all individual player names
        const allNames = Array.from(playerNamesSet);
        return allNames.length > 0 ? allNames : null;
    } catch (error) {
        console.error('Error fetching all player names:', error);
        return null;
    }
}

// Start gameplay when player arrives at starting point
async function startGameplay() {
    // Use actual player name (individual player name, not team name or booking name)
    const actualPlayerName = gameEngine.individualPlayerName || gameEngine.playerName;
    
    // Ensure game status is set to 'active' when gameplay starts (for non-booking games)
    if (!gameEngine.gameStatus || gameEngine.gameStatus === 'pending') {
        gameEngine.gameStatus = 'active';
    }
    
    // Show welcome message from character
    const welcomeMessages = [
        `Excellent! You've arrived at the starting point. Your journey through time begins now, ${actualPlayerName}!`,
        `Splendid! The adventure commences. Let's see what mysteries await you, ${actualPlayerName}!`,
        `Wonderful! You're ready to begin. The letter left behind awaits discovery, ${actualPlayerName}!`
    ];
    const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    
    // Set flag to continue after popup closes
    waitingForGameplayStart = true;
    showCharacterPopup(randomWelcome, null, false, true);
}

// Generate dashes based on answer length
function generateAnswerDashes(answer) {
    if (!answer) return '';
    // Split by spaces to handle multiple words
    const words = answer.split(' ');
    // Create separate dashes for each letter with spaces between them
    // Use '/ ' between words to differentiate from single space between letters
    // Show apostrophes as apostrophes instead of dashes
    return words.map(word => word.split('').map(char => char === "'" ? "'" : '_').join(' ')).join(' - '); // '/ ' between words
}

// Load current location data (with guardrail: only show location we've reached in sequence)
function loadCurrentLocation() {
    // Guardrail: ensure we never skip ahead (current index must not exceed completed locations + 1)
    const completedCount = (gameEngine.completedLocations || []).length;
    const maxLocations = gameData && gameData.locations ? gameData.locations.length : 10;
    const maxAllowedIndex = Math.min(completedCount + 1, maxLocations);
    if (gameEngine.currentLocationIndex > maxAllowedIndex) {
        gameEngine.currentLocationIndex = Math.max(0, maxAllowedIndex);
    }

    const location = gameEngine.getCurrentLocation();
    if (!location) return;
    
    // Check if this is location 4 and show Archibald message about secret message BEFORE showing clue
    if (location.id === 4) {
        const secretMessage = "A secret message is being sent to you! Read the message carefully and try to reach that location before the message is lost forever. The message will be destroyed as no one else should read it. Time is of the essence!";
        showCharacterPopupWithCallback(secretMessage, null, false, true, () => {
            // After popup closes, continue with normal clue display
            displayClueForLocation(location);
        });
        return; // Don't show clue yet, wait for popup to close
    }
    
    // Normal flow for other locations
    displayClueForLocation(location);
}

// Display clue for a location (separated for reuse)
function displayClueForLocation(location) {
    // Apply fade-in animation to clue section
    const clueSection = document.getElementById('clue-section');
    clueSection.classList.add('fade-in');
    setTimeout(() => {
        clueSection.classList.remove('fade-in');
    }, 1000);
    
    // Update clue section header for location 10 (Final clue)
    const clueHeader = document.querySelector('#clue-section .section-header h3');
    if (clueHeader) {
        if (location.id === 10) {
            clueHeader.textContent = '🔍 Final Clue';
        } else {
            clueHeader.textContent = '🔍 Your Clue';
        }
    }
    
    // Update clue and optional clue image
    document.getElementById('clue-text').textContent = location.clue;
    
    const clueImageContainer = document.getElementById('clue-image-container');
    const clueImage = document.getElementById('clue-image');
    if (clueImageContainer && clueImage) {
        if (location.clueImage) {
            clueImage.src = location.clueImage;
            clueImage.alt = `Clue for ${location.name || 'location'}`;
            clueImageContainer.style.display = 'block';
        } else {
            clueImage.src = '';
            clueImageContainer.style.display = 'none';
        }
    }
    
    // Update clue dashes - for location 10, use correctAnswer instead of locationName
    const clueDashes = document.getElementById('clue-dashes');
    if (clueDashes) {
        if (location.id === 10) {
            clueDashes.textContent = generateAnswerDashes(location.correctAnswer);
        } else {
            clueDashes.textContent = generateAnswerDashes(location.locationName);
        }
    }
    
    // Show clue section with location name input
    document.getElementById('clue-section').style.display = 'block';
    document.getElementById('location-name-input-container').style.display = 'block';
    
    // Update input label and placeholder for location 10
    const locationInputLabel = document.querySelector('#location-name-input-container label');
    const locationInput = document.getElementById('location-name-input');
    if (location.id === 10) {
        if (locationInputLabel) {
            locationInputLabel.textContent = 'Enter your answer:';
        }
        if (locationInput) {
            locationInput.placeholder = 'Type your answer here...';
        }
    } else {
        if (locationInputLabel) {
            locationInputLabel.textContent = 'Enter the location name:';
        }
        if (locationInput) {
            locationInput.placeholder = 'Type the location name here...';
        }
    }
    
    if (locationInput) {
        locationInput.value = '';
        locationInput.classList.remove('error', 'success');
    }
    
    // Clear any error messages from previous location
    const locationError = document.getElementById('location-name-input-error');
    if (locationError) {
        locationError.remove();
    }
    
    // Hide location info and question sections initially
    document.getElementById('location-info-section').style.display = 'none';
    document.getElementById('question-section').style.display = 'none';
    document.getElementById('action-buttons-container').style.display = 'none';
    
    // Reset hint buttons and re-enable map hint for new location
    resetHintButtons();
    
    // Re-enable and show map hint button for new clue (hide for location 10)
    const mapHintBtn = document.getElementById('map-hint-btn');
    if (mapHintBtn) {
        if (location.id === 10) {
            // Hide map hint button for final clue (location 10)
            mapHintBtn.style.display = 'none';
        } else {
            mapHintBtn.disabled = false;
            mapHintBtn.style.display = 'block';
        }
    }
    
    // Show the hint-buttons container in clue section
    const clueHintButtons = document.querySelector('#clue-section .hint-buttons');
    if (clueHintButtons) {
        clueHintButtons.style.display = 'flex';
    }
    
    // Update locations panel
    updateLocationsPanel();
    
    // Set up encouragement timer for this location (10 minutes)
    setupEncouragementTimer(location);
}

// Set up timer to show encouragement message after 10 minutes if answer not found
let encouragementTimer = null;
function setupEncouragementTimer(location) {
    // Don't set up encouragement timer if game is completed or on final screen
    if (gameEngine.gameStatus === 'completed') {
        return;
    }
    
    // Clear any existing timer
    if (encouragementTimer) {
        clearTimeout(encouragementTimer);
        encouragementTimer = null;
    }
    
    // Set timer for 10 minutes (600000 ms)
    encouragementTimer = setTimeout(() => {
        // Check again if we're on final screen before showing message
        const finalScreen = document.getElementById('final-screen');
        if (finalScreen && finalScreen.classList.contains('active')) {
            return; // Don't show encouragement if on final screen
        }
        
        if (gameEngine.gameStatus === 'completed') {
            return; // Don't show encouragement if game is completed
        }
        
        // Check if location is still current and answer hasn't been submitted
        const currentLocation = gameEngine.getCurrentLocation();
        if (currentLocation && currentLocation.id === location.id) {
            const encouragementMessages = [
                "Keep going! You're on the right track. Sometimes the answer is closer than you think.",
                "Don't give up! Every great explorer faces challenges. Take a deep breath and look at the clues again.",
                "You've got this! Remember, hints are available if you need them. The journey is worth it!",
                "Stay focused! The answer is waiting for you. Trust your instincts and keep exploring."
            ];
            const randomMessage = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
            showCharacterPopup(randomMessage, null, false, true);
        }
    }, 600000); // 10 minutes
}

// Handle location name submission
function handleSubmitLocationName() {
    const locationNameInput = document.getElementById('location-name-input');
    const answerText = locationNameInput.value.trim();
    const errorContainer = document.getElementById('location-name-error');
    const location = gameEngine.getCurrentLocation();
    
    // Clear previous error
    if (errorContainer) {
        errorContainer.remove();
    }
    
    if (!answerText) {
        showInputError(locationNameInput, location.id === 10 ? 'Please enter your answer.' : 'Please enter a location name.');
        return;
    }
    
    // For location 10, validate against correctAnswer instead of locationName
    let result;
    if (location.id === 10) {
        // Check answer directly against correctAnswer
        const normalizedInput = gameEngine.normalizeAnswer(answerText);
        const normalizedCorrect = gameEngine.normalizeAnswer(location.correctAnswer);
        result = { correct: normalizedInput === normalizedCorrect };
    } else {
        // Normal location name validation
        result = gameEngine.submitLocationName(answerText);
    }
    
    if (result && result.correct) {
        locationNameInput.classList.remove('error');
        locationNameInput.classList.add('success');
        if (errorContainer) errorContainer.remove();
        
        // For location 10, go directly to final letter
        if (location.id === 10) {
            // Mark location as completed
            if (!gameEngine.answersSubmitted.has(location.id)) {
                gameEngine.answersSubmitted.add(location.id);
                gameEngine.completedLocations.push({
                    id: location.id,
                    name: location.locationName || location.name,
                    answer: location.correctAnswer
                });
                gameEngine.addScore(100);
            }
            
            // Save game state
            saveGameState();
            
            // Show final message and go to final screen
            const finalMessage = "Magnificent! You've solved the final puzzle! The letter left behind from 1800 is now yours to discover.";
            showCharacterPopupWithCallback(finalMessage, null, false, true, () => {
                showFinalScreen();
            });
            return;
        }
        
        // Show motivational message from character for normal locations
        const locationMessages = [
            `Excellent work! You've found ${location.locationName || location.name}. Well done!`,
            `Splendid! ${location.locationName || location.name} is indeed the correct location.`,
            `Bravo! You've correctly identified ${location.locationName || location.name}.`
        ];
        const randomMessage = locationMessages[Math.floor(Math.random() * locationMessages.length)];
        
        // Store callback to continue after popup closes
        const continueAfterPopup = () => {
            // Hide the entire clue section since location is now identified
            const clueSection = document.getElementById('clue-section');
            if (clueSection) {
                clueSection.style.display = 'none';
            }
            
            // Show location confirmation (no animation - keep static)
            document.getElementById('location-name').textContent = location.locationName || location.name;
            const locationInfoSection = document.getElementById('location-info-section');
            locationInfoSection.style.display = 'block';
            // Remove scroll-reveal class to keep it static
            locationInfoSection.classList.remove('scroll-reveal');
            
            // Save game state after correct location name
            saveGameState();
            
            // Show question section immediately without delay
            showQuestionSection();
        };
        
        // Show character popup with callback
        showCharacterPopupWithCallback(randomMessage, null, false, true, continueAfterPopup);
    } else {
        showInputError(locationNameInput, location.id === 10 ? 'Incorrect answer. Try again!' : 'Incorrect location. Try again!');
    }
}

// Show question section
function showQuestionSection() {
    const location = gameEngine.getCurrentLocation();
    if (!location) return;
    
    document.getElementById('question-text').textContent = location.question;
    document.getElementById('answer-input').value = '';
    document.getElementById('answer-input').classList.remove('error', 'success');
    
    // Update question dashes based on correct answer
    const questionDashes = document.getElementById('question-dashes');
    if (questionDashes && location.correctAnswer) {
        questionDashes.textContent = generateAnswerDashes(location.correctAnswer);
    }
    
    // Clear any error messages from previous question
    const answerError = document.getElementById('answer-input-error');
    if (answerError) {
        answerError.remove();
    }
    
    const questionSection = document.getElementById('question-section');
    questionSection.style.display = 'block';
    // Remove all animations - display statically
    questionSection.classList.remove('scroll-reveal', 'fade-in');
    
    document.getElementById('action-buttons-container').style.display = 'block';
    
    // Reset hint buttons (text hint for question section)
    resetHintButtons();
}

// Submit answer - Allow unlimited retries
function submitAnswer() {
    const answerInput = document.getElementById('answer-input');
    const answerText = answerInput.value.trim();
    const errorContainer = document.getElementById('answer-input-error');
    
    // Clear previous error
    if (errorContainer) {
        errorContainer.remove();
    }
    
    if (!answerText) {
        showInputError(answerInput, 'Please enter an answer.');
        return;
    }
    
    const result = gameEngine.submitAnswer(answerText);
    
    if (result) {
        if (result.correct) {
            // Clear encouragement timer since answer was found
            if (encouragementTimer) {
                clearTimeout(encouragementTimer);
                encouragementTimer = null;
            }
            
            answerInput.classList.remove('error');
            answerInput.classList.add('success');
            if (errorContainer) errorContainer.remove();
            showMessage('Correct! +' + result.points + ' points', 'success');
            
            // Show motivational message from character
            const locationNumber = gameEngine.getCurrentLocationNumber();
            const totalLocations = gameData.locations.length;
            const motivationalMessages = getMotivationalMessage(locationNumber, totalLocations);
            
            // Update locations panel
            updateLocationsPanel();
            
            // Save game state after correct answer
            saveGameState();
            
            // Check if game is complete
            if (gameEngine.isGameComplete()) {
                // Show final motivational message, then final screen
                setTimeout(() => {
                    showCharacterPopupWithCallback(motivationalMessages.message, null, false, true, () => {
                        showFinalScreen();
                    });
                }, 1000);
            } else {
                // Show motivational message, then move to next location
                setTimeout(() => {
                    showCharacterPopupWithCallback(motivationalMessages.message, null, false, true, async () => {
                        gameEngine.nextLocation();
                        loadCurrentLocation();
                        showMessage('', ''); // Clear message
                        // Save state after moving to next location
                        await saveGameState();
                    });
                }, 1000);
            }
        } else {
            showInputError(answerInput, 'Incorrect answer. Try again!');
        }
    }
}

// Show error message below input field
function showInputError(inputElement, message) {
    // Remove existing error
    const existingError = inputElement.parentElement.querySelector('.input-error');
    if (existingError) {
        existingError.remove();
    }
    
    inputElement.classList.add('error');
    inputElement.classList.remove('success');
    
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'input-error';
    errorDiv.id = inputElement.id + '-error';
    errorDiv.textContent = message;
    
    // Insert after input field
    inputElement.parentElement.insertBefore(errorDiv, inputElement.nextSibling);
}

// Show text hint
async function showTextHint() {
    const hint = gameEngine.useTextHint();
    if (hint) {
        // Show character popup with hint
        const hintMessages = [
            "Ah, seeking guidance, are we? Very well, let me illuminate your path...",
            "A wise choice to seek assistance! Here's what I can tell you...",
            "Excellent! Asking for help shows wisdom. Allow me to share this insight...",
            "I see you need a nudge in the right direction. Here's what you should know..."
        ];
        const randomMessage = hintMessages[Math.floor(Math.random() * hintMessages.length)];
        showCharacterPopup(randomMessage, hint, false, false);
        updateScoreDisplay(gameEngine.getScore());
        resetHintButtons();
        // Save state after using hint
        await saveGameState();
    }
}

// Show map hint
async function showMapHint() {
    const hintData = gameEngine.useMapHint();
    if (hintData) {
        const location = gameEngine.getCurrentLocation();
        
        // If mapHint is null/empty, show clue-specific text hint instead
        if (!hintData.mapUrl || !location.mapHint) {
            // Show clue-specific text hint instead of map
            const hintMessages = [
                "Ah, you seek guidance! Let me point you in the right direction...",
                "A helpful clue to guide your journey! Here's what you need to know...",
                "Excellent! Sometimes a different perspective is what's needed. Behold...",
                "The way becomes clearer with this guidance. Here's your hint..."
            ];
            const randomMessage = hintMessages[Math.floor(Math.random() * hintMessages.length)];
            
            // For location 2, use the clue-specific hint
            // For location 10, use the placeholder text hint
            let clueHint = null;
            if (location.id === 2) {
                clueHint = "Go to level above, find a sculpture made by Peter Laslo Peri, named: The Sunbathers";
            } else if (location.id === 10) {
                clueHint = location.textHint; // Use the placeholder text hint for location 10
            }
            
            showCharacterPopup(randomMessage, clueHint || location.textHint, false, false);
        } else {
            // Show character popup with map hint
            const hintMessages = [
                "Ah, you seek the path forward! Let me show you the way...",
                "A map to guide your journey! Here's where you must go...",
                "Excellent! Sometimes a visual guide is what's needed. Behold...",
                "The way becomes clearer with a map. Here's your route..."
            ];
            const randomMessage = hintMessages[Math.floor(Math.random() * hintMessages.length)];
            showCharacterPopupWithMap(randomMessage, hintData.mapUrl, false);
        }
        updateScoreDisplay(gameEngine.getScore());
        resetHintButtons();
        // Save state after using hint
        await saveGameState();
    }
}

// Show hint modal
function showHintModal(title, text, isMapHint) {
    document.getElementById('hint-modal-title').textContent = title;
    document.getElementById('hint-text').textContent = text;
    
    const mapContainer = document.getElementById('map-hint-container');
    if (isMapHint) {
        mapContainer.style.display = 'block';
        // Hide the "Next location" text
        const mapHintText = document.getElementById('map-hint-text');
        if (mapHintText) {
            mapHintText.style.display = 'none';
        }
    } else {
        mapContainer.style.display = 'none';
    }
    
    document.getElementById('hint-modal').classList.add('active');
}

// Close hint modal
function closeHintModal() {
    document.getElementById('hint-modal').classList.remove('active');
}

// Show titbits
function showTitbits() {
    const location = gameEngine.getCurrentLocation();
    if (!location) return;
    
    // Don't pause timer - players should not be able to manipulate timer by viewing titbits
    // Timer continues running while viewing titbits
    
    // Show titbits
    document.getElementById('titbits-text').innerHTML = `<p>${location.titbits}</p>`;
    showScreen('titbits-screen');
}

// Close titbits
function closeTitbits() {
    // Don't resume timer - it was never paused
    // Timer continues running normally
    
    // Return to game screen
    showScreen('game-screen');
}

// Get recipient name for final letter: booking name if available, else player name from game start
async function getFinalLetterRecipient() {
    if (gameEngine.bookingId && window.DatabaseService) {
        try {
            const dbRef = window.DatabaseService.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
            if (dbRef) {
                const bookingDoc = await dbRef.collection('bookings').doc(gameEngine.bookingId).get();
                const docExists = typeof bookingDoc.exists === 'function' ? bookingDoc.exists() : bookingDoc.exists;
                if (docExists) {
                    const bookingData = bookingDoc.data();
                    if (bookingData && bookingData.messageTo && String(bookingData.messageTo).trim()) {
                        return String(bookingData.messageTo).trim();
                    }
                    if (bookingData && bookingData.name && String(bookingData.name).trim()) {
                        return String(bookingData.name).trim();
                    }
                }
            }
        } catch (e) {
            console.warn('Could not fetch booking for recipient name:', e.message);
        }
    }
    return gameEngine.individualPlayerName || gameEngine.playerName || (gameEngine.groupMembers && gameEngine.groupMembers[0]) || 'Adventurer';
}

// Fetch personal message from database/API
async function fetchPersonalMessage() {
    try {
        const recipient = await getFinalLetterRecipient();
        const defaultOpening = `Dear ${recipient},\n\nIn the year 1800, this message was written but never delivered. Through time and space, it has found its way to you.`;
        
        // Try to get personal message from booking/game session
        let personalizedMessage = null;
        let messageFrom = null;
        
        if (gameEngine.bookingId && window.DatabaseService) {
            const sessionId = getSessionId();
            if (sessionId) {
                const sessionData = await window.DatabaseService.loadGameStateBySessionId(sessionId);
                if (sessionData && sessionData.personalMessage && sessionData.personalMessage.trim()) {
                    personalizedMessage = sessionData.personalMessage;
                    messageFrom = sessionData.messageFrom;
                }
            }
            
            // Try to get from booking document if not found in session
            if (!personalizedMessage) {
                const dbRef = window.DatabaseService.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
                if (dbRef) {
                    const bookingDoc = await dbRef.collection('bookings').doc(gameEngine.bookingId).get();
                    const docExists = typeof bookingDoc.exists === 'function' ? bookingDoc.exists() : bookingDoc.exists;
                    if (docExists) {
                        const bookingData = bookingDoc.data();
                        if (bookingData && bookingData.personalMessage && bookingData.personalMessage.trim()) {
                            personalizedMessage = bookingData.personalMessage;
                            messageFrom = bookingData.messageFrom;
                        }
                    }
                }
            }
        }
        
        // Store messageFrom in gameEngine for signature use (even if no personalized message)
        gameEngine.messageFrom = messageFrom;
        
        // If personalized message exists, combine with default opening
        if (personalizedMessage) {
            // Format: Dear name, blank line, default text, blank line, personalized message
            let fullMessage = `Dear ${recipient},\n\nIn the year 1800, this message was written but never delivered. Through time and space, it has found its way to you — \n\n${personalizedMessage}`;
            return fullMessage;
        }
        
        // Fallback to default message if no personalized message
        // Note: messageFrom is already stored in gameEngine.messageFrom for signature use
        return await getDefaultMessageAsync();
    } catch (error) {
        console.error('Error fetching personal message:', error);
        // Fallback to default message (with correct recipient from booking/player)
        return await getDefaultMessageAsync();
    }
}

// Get default message if none is available (uses same recipient as fetchPersonalMessage)
async function getDefaultMessageAsync() {
    const recipient = await getFinalLetterRecipient();
    return `Dear ${recipient},\n\nIn the year 1800, this message was written but never delivered. Through time and space, it has found its way to you.\n\nYou have followed the trail, solved the puzzles, and proven yourself worthy. This letter was meant for you, across the centuries.\n\nMay this journey remind you that some messages are timeless, and some connections transcend the boundaries of time itself.`;
}

function getDefaultMessage() {
    // Synchronous fallback only when async not possible (recipient may be wrong until fetch completes)
    const recipient = gameEngine.individualPlayerName || gameEngine.playerName || (gameEngine.groupMembers && gameEngine.groupMembers[0]) || 'Adventurer';
    return `Dear ${recipient},\n\nIn the year 1800, this message was written but never delivered. Through time and space, it has found its way to you.\n\nYou have followed the trail, solved the puzzles, and proven yourself worthy. This letter was meant for you, across the centuries.\n\nMay this journey remind you that some messages are timeless, and some connections transcend the boundaries of time itself.`;
}

// Show final screen
async function showFinalScreen() {
    // Stop timer
    gameEngine.stopTimer();
    
    // Clear any active encouragement timer to prevent Archibald messages on final screen
    if (encouragementTimer) {
        clearTimeout(encouragementTimer);
        encouragementTimer = null;
    }
    
    // Update game status to completed
    if (window.DatabaseService && window.DatabaseService.isInitialized() && gameEngine.bookingId) {
        const sessionId = getSessionId();
        if (sessionId) {
            await window.DatabaseService.updateGameStatus(sessionId, 'completed');
        }
    }
    gameEngine.gameStatus = 'completed';
    
    // Fetch personal message from database
    const personalMessage = await fetchPersonalMessage();
    
    // Update game engine with the fetched message
    gameEngine.personalMessage = personalMessage;
    
    // Get final stats
    const stats = gameEngine.getFinalStats();
    
    // Save completed game to database
    if (window.DatabaseService) {
        const completedGameData = {
            playerType: currentPlayerType,
            playerName: gameEngine.playerName,
            teamName: gameEngine.teamName || null, // Store team name for group games
            individualPlayerName: gameEngine.individualPlayerName || null, // Store individual player name
            groupMembers: gameEngine.groupMembers,
            score: stats.score,
            time: gameEngine.elapsedTime, // in seconds
            completedLocations: gameEngine.completedLocations,
            hintsUsed: {
                textHints: Array.from(gameEngine.hintsUsed.textHints),
                mapHints: Array.from(gameEngine.hintsUsed.mapHints)
            }
        };
        await window.DatabaseService.saveCompletedGame(completedGameData);
    }
    
    // Update final screen
    document.getElementById('final-time').textContent = stats.time;
    document.getElementById('final-score').textContent = stats.score;
    
    // Update signature based on messageFrom
    const signatureElement = document.querySelector('.letter-signature p');
    if (signatureElement) {
        if (gameEngine.messageFrom && gameEngine.messageFrom.trim()) {
            signatureElement.textContent = `— From ${gameEngine.messageFrom}`;
        } else {
            signatureElement.textContent = '— A message from the past';
        }
    }
    
    // Show final screen first
    showScreen('final-screen');
    
    // Start typewriter effect for letter after screen is shown
    setTimeout(() => {
        startTypewriterEffect(stats.personalMessage);
    }, 500);
}

// Typewriter effect for letter content
function startTypewriterEffect(message) {
    const messageElement = document.getElementById('personal-message-text');
    const fullText = message.replace(/\n/g, '<br>');
    messageElement.innerHTML = '';
    messageElement.style.opacity = '1';
    
    let index = 0;
    const speed = 30; // milliseconds per character
    
    function typeWriter() {
        if (index < fullText.length) {
            // Handle HTML tags
            if (fullText.substring(index, index + 4) === '<br>') {
                messageElement.innerHTML += '<br>';
                index += 4;
            } else {
                messageElement.innerHTML += fullText.charAt(index);
                index++;
            }
            setTimeout(typeWriter, speed);
        }
    }
    
    typeWriter();
}

// Show feedback modal
function showFeedbackModal() {
    // Reset form
    document.getElementById('feedback-form').reset();
    document.getElementById('rating').value = '';
    document.querySelectorAll('.rating-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('feedback-form').style.display = 'block';
    document.getElementById('feedback-success').style.display = 'none';
    
    document.getElementById('feedback-modal').classList.add('active');
}

// Close feedback modal
function closeFeedbackModal() {
    document.getElementById('feedback-modal').classList.remove('active');
    // Reset form when closing
    document.getElementById('feedback-form').reset();
    document.getElementById('rating').value = '';
    document.querySelectorAll('.rating-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('feedback-form').style.display = 'block';
    document.getElementById('feedback-success').style.display = 'none';
    
    // Clear errors
    document.querySelectorAll('.form-group').forEach(group => group.classList.remove('error'));
    const errorContainer = document.getElementById('feedback-errors');
    if (errorContainer) {
        errorContainer.innerHTML = '';
        errorContainer.style.display = 'none';
    }
}

// Handle feedback form submission
async function handleFeedbackSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = document.getElementById('submit-feedback-btn');
    const originalText = submitBtn.textContent;
    
    // Get form data
    const rating = document.getElementById('rating').value;
    const enjoyed = Array.from(document.querySelectorAll('input[name="enjoyed"]:checked')).map(cb => cb.value);
    const difficulty = document.getElementById('difficulty').value;
    const recommend = document.getElementById('recommend').value;
    const improvements = document.getElementById('improvements').value.trim();
    const comments = document.getElementById('comments').value.trim();
    const email = document.getElementById('email').value.trim();
    
    // Validation
    let isValid = true;
    const errorMessages = [];
    
    // Clear previous errors
    document.querySelectorAll('.form-group').forEach(group => group.classList.remove('error'));
    const errorContainer = document.getElementById('feedback-errors');
    if (errorContainer) {
        errorContainer.innerHTML = '';
        errorContainer.style.display = 'none';
    }
    
    if (!rating) {
        showFormError('rating', 'Please select a rating');
        errorMessages.push('Please select a rating');
        isValid = false;
    }
    
    if (enjoyed.length === 0) {
        showFormError(document.querySelector('.checkbox-group').closest('.form-group'), 'Please select at least one option');
        errorMessages.push('Please select what you enjoyed');
        isValid = false;
    }
    
    if (!difficulty) {
        showFormError('difficulty', 'Please select difficulty level');
        errorMessages.push('Please select difficulty level');
        isValid = false;
    }
    
    if (!recommend) {
        showFormError('recommend', 'Please select recommendation');
        errorMessages.push('Please select recommendation');
        isValid = false;
    }
    
    if (!isValid) {
        // Show errors near submit button
        if (errorContainer && errorMessages.length > 0) {
            errorContainer.innerHTML = '<strong>Please fix the following errors:</strong><ul>' + 
                errorMessages.map(msg => `<li>${msg}</li>`).join('') + '</ul>';
            errorContainer.style.display = 'block';
            // Scroll to error container
            errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
    }
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
        // Get current game stats
        const stats = gameEngine.getFinalStats();
        
        // Prepare feedback data
        const feedbackData = {
            rating: parseInt(rating),
            enjoyed: enjoyed,
            difficulty: difficulty,
            recommend: recommend,
            improvements: improvements || null,
            comments: comments || null,
            email: email || null,
            playerName: gameEngine.playerName || 'Anonymous',
            playerType: currentPlayerType || 'solo',
            groupMembers: gameEngine.groupMembers || [],
            gameScore: stats.score || 0,
            gameTime: gameEngine.elapsedTime || 0,
            completedAt: new Date().toISOString()
        };
        
        // Save to database
        if (window.DatabaseService) {
            const saved = await window.DatabaseService.saveFeedback(feedbackData);
            if (saved) {
                // Show success message
                document.getElementById('feedback-form').style.display = 'none';
                document.getElementById('feedback-success').style.display = 'block';
            } else {
                throw new Error('Failed to save feedback');
            }
        } else {
            // Fallback: show success even if database not available
            document.getElementById('feedback-form').style.display = 'none';
            document.getElementById('feedback-success').style.display = 'block';
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        alert('There was an error submitting your feedback. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Show form error
function showFormError(fieldIdOrElement, message) {
    let formGroup;
    if (typeof fieldIdOrElement === 'string') {
        const field = document.getElementById(fieldIdOrElement);
        formGroup = field ? field.closest('.form-group') : null;
    } else {
        formGroup = fieldIdOrElement;
    }
    
    if (formGroup) {
        formGroup.classList.add('error');
        let errorElement = formGroup.querySelector('.form-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'form-error';
            formGroup.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }
}

// Setup rating buttons
function setupRatingButtons() {
    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove selected class from all buttons
            document.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('selected'));
            // Add selected class to clicked button
            this.classList.add('selected');
            // Set hidden input value
            document.getElementById('rating').value = this.dataset.rating;
            // Clear error if any
            const formGroup = this.closest('.form-group');
            if (formGroup) {
                formGroup.classList.remove('error');
            }
        });
    });
}

// Share results
function shareResults() {
    const stats = gameEngine.getFinalStats();
    const shareText = `I completed the Letter Left Behind treasure hunt!\n\nTime: ${stats.time}\nScore: ${stats.score} points\n\nCan you beat my time?`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Letter Left Behind - Treasure Hunt',
            text: shareText
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Results copied to clipboard!');
        }).catch(() => {
            alert('Share feature not available. Your results:\n\n' + shareText);
        });
    }
}

// Show a specific screen
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    
    // Show/hide locations panel based on active screen
    const locationsPanel = document.getElementById('locations-panel');
    if (screenId === 'game-screen') {
        locationsPanel.style.display = 'flex';
    } else {
        locationsPanel.style.display = 'none';
    }
    
    // Hide stage indicator on non-game screens
    const stageIndicator = document.getElementById('location-stage-indicator');
    if (stageIndicator) {
        if (screenId === 'game-screen') {
            // Will be shown/hidden by loadCurrentLocation
        } else {
            stageIndicator.style.display = 'none';
        }
    }
}

// Update timer display
function updateTimerDisplay(seconds) {
    const formatted = gameEngine.formatTime(seconds);
    document.getElementById('timer').textContent = formatted;
}

// Update score display
function updateScoreDisplay(score) {
    document.getElementById('score').textContent = score;
}

// Show message
function showMessage(text, type) {
    // Remove existing messages
    const existing = document.querySelector('.message');
    if (existing) {
        existing.remove();
    }
    
    if (!text) return;
    
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    
    const gameContent = document.querySelector('.game-content');
    if (gameContent) {
        gameContent.insertBefore(message, gameContent.firstChild);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            message.remove();
        }, 3000);
    }
}

// Reset hint buttons
function resetHintButtons() {
    const textHintBtn = document.getElementById('text-hint-btn');
    const mapHintBtn = document.getElementById('map-hint-btn');
    
    const location = gameEngine.getCurrentLocation();
    if (location) {
        const textHintUsed = gameEngine.hasUsedTextHint();
        const mapHintUsed = gameEngine.hasUsedMapHint();
        
        // Hints can be shown multiple times, but only deduct points on first use
        textHintBtn.disabled = false;
        mapHintBtn.disabled = false;
        
        if (textHintUsed) {
            textHintBtn.textContent = '💡 Text Hint (View Again)';
        } else {
            textHintBtn.textContent = '💡 Text Hint (-30 pts)';
        }
        
        if (mapHintUsed) {
            mapHintBtn.textContent = '🗺️ Map Hint (View Again)';
        } else {
            mapHintBtn.textContent = '🗺️ Map Hint (-50 pts)';
        }
    }
}

// Update location stage indicator
function updateLocationStageIndicator() {
    const location = gameEngine.getCurrentLocation();
    if (!location) return;
    
    const currentLocationNumber = gameEngine.getCurrentLocationNumber();
    const totalLocations = gameData.locations.length;
    const stageIndicator = document.getElementById('location-stage-indicator');
    const stageText = document.getElementById('stage-text');
    
    if (stageIndicator && stageText) {
        // Smart stage indicators based on progress
        const progress = currentLocationNumber / totalLocations;
        let stageLabel = '';
        
        if (currentLocationNumber === 1) {
            stageLabel = '📍 Beginning Your Quest';
        } else if (currentLocationNumber === Math.floor(totalLocations / 2)) {
            stageLabel = '⚖️ Halfway Through Your Journey';
        } else if (currentLocationNumber === totalLocations - 1) {
            stageLabel = '🏁 Approaching the Final Destination';
        } else if (currentLocationNumber === totalLocations) {
            stageLabel = '🎯 Final Stage';
        } else if (progress < 0.3) {
            stageLabel = `🌱 Early Stages of Your Adventure`;
        } else if (progress < 0.7) {
            stageLabel = `🚶 Making Steady Progress`;
        } else {
            stageLabel = `🏃 Nearing the End`;
        }
        
        stageText.textContent = `${stageLabel} • Stage ${currentLocationNumber} of ${totalLocations}`;
        stageIndicator.style.display = 'block';
    }
}

// Update locations panel
function updateLocationsPanel() {
    const completedLocations = gameEngine.getCompletedLocations();
    const locationsList = document.getElementById('locations-list');
    
    if (completedLocations.length === 0) {
        locationsList.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Complete locations to see your journey...</p>';
        return;
    }
    
    locationsList.innerHTML = '';
    completedLocations.forEach((loc, index) => {
        const item = document.createElement('div');
        item.className = 'location-item';
        item.innerHTML = `
            <div class="location-item-header">Location ${loc.id}: ${loc.name}</div>
            <div class="location-item-answer">Answer: ${loc.answer}</div>
        `;
        locationsList.appendChild(item);
    });
}

// Toggle locations panel
function toggleLocationsPanel() {
    const panel = document.getElementById('locations-panel');
    const btn = document.getElementById('toggle-locations-panel-btn');
    
    panel.classList.toggle('collapsed');
    btn.textContent = panel.classList.contains('collapsed') ? '+' : '−';
}

// Save game state to database
async function saveGameState() {
    if (!window.DatabaseService || !gameEngine) return;
    
    try {
        await window.DatabaseService.saveGameState(gameEngine, currentPlayerType);
    } catch (error) {
        console.error('Error saving game state:', error);
    }
}

// Auto-save game state periodically
function startAutoSave() {
    // Save every 30 seconds if game is running
    saveStateInterval = setInterval(() => {
        if (gameEngine && gameEngine.isTimerRunning) {
            saveGameState();
        }
    }, 30000); // 30 seconds
}

// Stop auto-save
function stopAutoSave() {
    if (saveStateInterval) {
        clearInterval(saveStateInterval);
        saveStateInterval = null;
    }
}

// Check for saved game state and resume if available
async function checkForSavedGame() {
    if (!window.DatabaseService) return;
    
    try {
        // Only check for saved game if there's a booking ID and we're resuming the same player's session
        const bookingId = getURLParameter('bookingId');
        
        // For booking-based games, only restore if it's the same player's session
        // Each new player should start fresh from location 0
        if (bookingId) {
            // Check if this is the same session (same session ID in localStorage)
            // If not, don't restore - let them start fresh
            const savedState = await window.DatabaseService.loadGameState();
            if (savedState && savedState.currentLocationIndex > 0 && savedState.bookingId === bookingId) {
                // Same booking, same session - ask if they want to resume
                const resume = confirm('We found a saved game. Would you like to resume where you left off?');
                if (resume) {
                    resumeGame(savedState);
                } else {
                    // Clear saved state if user doesn't want to resume
                    await window.DatabaseService.deleteGameSession();
                }
            }
            // If no saved state or different session, let them start fresh (don't restore)
        } else {
            // Non-booking game - check for saved state normally
            const savedState = await window.DatabaseService.loadGameState();
            if (savedState && savedState.currentLocationIndex > 0) {
                // Ask user if they want to resume
                const resume = confirm('We found a saved game. Would you like to resume where you left off?');
                if (resume) {
                    resumeGame(savedState);
                } else {
                    // Clear saved state if user doesn't want to resume
                    await window.DatabaseService.deleteGameSession();
                }
            }
        }
    } catch (error) {
        console.error('Error checking for saved game:', error);
    }
}

// Resume game from saved state
function resumeGame(savedState) {
    // Restore game engine state
    gameEngine.restoreState(savedState);
    currentPlayerType = savedState.playerType || 'solo';
    
    // Update UI
    updateScoreDisplay(gameEngine.getScore());
    updateTimerDisplay(gameEngine.elapsedTime);
    updateLocationsPanel();
    
    // Restore and resume timer - don't add disconnected time, just resume from saved elapsed time
    if (savedState.currentLocationIndex > 0) {
        const now = Date.now();
        const savedElapsedTime = savedState.elapsedTime || 0;
        const savedTotalPauseTime = savedState.totalPauseTime || 0;
        
        // Restore timer state - don't add any time that passed while disconnected
        // Just resume from the saved elapsed time
        gameEngine.elapsedTime = savedElapsedTime;
        gameEngine.totalPauseTime = savedTotalPauseTime;
        
        // Calculate start time so timer continues from saved elapsed time
        // Formula in game engine: elapsed = (now - startTime - totalPauseTime) / 1000
        // We want: elapsed = savedElapsedTime (at resume time)
        // So: startTime = now - (savedElapsedTime * 1000) - (savedTotalPauseTime * 1000)
        gameEngine.startTime = now - (savedElapsedTime * 1000) - (savedTotalPauseTime * 1000);
        
        if (savedState.isTimerPaused) {
            // Timer was paused (e.g., viewing titbits) - restore pause state
            gameEngine.isTimerRunning = true;
            gameEngine.isTimerPaused = true;
            gameEngine.pauseStartTime = savedState.pauseStartTime || now;
            console.log('Timer restored - was paused, elapsed time:', gameEngine.elapsedTime);
        } else {
            // Timer should be running - resume it from saved elapsed time
            gameEngine.isTimerRunning = true;
            gameEngine.isTimerPaused = false;
            gameEngine.pauseStartTime = null;
            
            // Stop any existing timer interval
            if (gameEngine.timerInterval) {
                clearInterval(gameEngine.timerInterval);
                gameEngine.timerInterval = null;
            }
            
            // Start the timer - this will continue counting from saved elapsed time
            gameEngine.updateTimer();
            console.log('Timer resumed from:', gameEngine.elapsedTime, 'seconds');
        }
        
        // Update timer display immediately with saved elapsed time
        updateTimerDisplay(gameEngine.elapsedTime);
    } else {
        // At starting point - timer hasn't started yet
        gameEngine.elapsedTime = 0;
        gameEngine.isTimerRunning = false;
        gameEngine.isTimerPaused = false;
        updateTimerDisplay(0);
        console.log('Timer not started - at starting point');
    }
    
    // Show appropriate screen based on current location
    if (savedState.currentLocationIndex === 0) {
        showScreen('starting-point-screen');
        document.getElementById('starting-location-name').textContent = gameData.startingLocation.name;
        document.getElementById('starting-location-address').textContent = gameData.startingLocation.address;
    } else {
        showScreen('game-screen');
        loadCurrentLocation();
    }
}

// Show resume game modal
function showResumeGameModal() {
    document.getElementById('resume-game-modal').classList.add('active');
    document.getElementById('resume-player-name').value = '';
    document.getElementById('saved-games-results').style.display = 'none';
    document.getElementById('saved-games-list').innerHTML = '';
    document.getElementById('no-games-found').style.display = 'none';
    document.getElementById('resume-loading').style.display = 'none';
}

// Close resume game modal
function closeResumeGameModal() {
    document.getElementById('resume-game-modal').classList.remove('active');
}

// Search for saved games by player name
async function searchSavedGames() {
    const playerName = document.getElementById('resume-player-name').value.trim();
    
    if (!playerName) {
        alert('Please enter your name to search for saved games.');
        return;
    }
    
    if (!window.DatabaseService || !window.DatabaseService.isInitialized()) {
        alert('Database not available. Please check your connection.');
        return;
    }
    
    const resultsDiv = document.getElementById('saved-games-results');
    const gamesList = document.getElementById('saved-games-list');
    const noGamesFound = document.getElementById('no-games-found');
    const loadingDiv = document.getElementById('resume-loading');
    
    // Show loading
    resultsDiv.style.display = 'block';
    gamesList.innerHTML = '';
    noGamesFound.style.display = 'none';
    loadingDiv.style.display = 'block';
    
    try {
        const games = await window.DatabaseService.searchSavedGamesByPlayerName(playerName);
        
        loadingDiv.style.display = 'none';
        
        if (games.length === 0) {
            noGamesFound.style.display = 'block';
            gamesList.innerHTML = '';
        } else {
            noGamesFound.style.display = 'none';
            
            let html = '';
            games.forEach((game, index) => {
                const lastUpdated = game.lastUpdated.toLocaleString();
                const locationText = game.currentLocationIndex === 0 
                    ? 'Starting Point' 
                    : `Location ${game.currentLocationIndex}`;
                const timeText = formatTimeForResume(game.elapsedTime);
                
                html += `
                    <div style="background: rgba(102, 126, 234, 0.1); border-radius: 8px; padding: 15px; margin-bottom: 10px; border-left: 4px solid var(--accent-color);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                            <div>
                                <strong style="color: var(--primary-color);">Game ${index + 1}</strong>
                                <div style="font-size: 0.9rem; color: #666; margin-top: 5px;">
                                    ${locationText} • Score: ${game.score} ⭐ • Time: ${timeText}
                                </div>
                                <div style="font-size: 0.85rem; color: #999; margin-top: 5px;">
                                    Last saved: ${lastUpdated}
                                </div>
                            </div>
                            <button class="btn-primary" onclick="resumeSelectedGame('${game.id}', '${game.sessionId}')" style="padding: 8px 15px; font-size: 0.9rem;">
                                Resume
                            </button>
                        </div>
                    </div>
                `;
            });
            
            gamesList.innerHTML = html;
        }
    } catch (error) {
        console.error('Error searching saved games:', error);
        loadingDiv.style.display = 'none';
        
        // Show more detailed error message
        let errorMessage = 'Error searching for saved games. ';
        if (error.message) {
            errorMessage += error.message;
        } else {
            errorMessage += 'Please check the console for details.';
        }
        
        // Check if it's an index error
        if (error.message && error.message.includes('index')) {
            errorMessage += '\n\nYou may need to create a Firestore index. Check the console for the link.';
        }
        
        alert(errorMessage);
    }
}

// Resume selected game - directly loads from database
async function resumeSelectedGame(gameId, sessionId) {
    if (!window.DatabaseService) {
        alert('Database not available.');
        return;
    }
    
    const loadingDiv = document.getElementById('resume-loading');
    loadingDiv.style.display = 'block';
    
    try {
        console.log('Resuming game with document ID:', gameId, 'sessionId:', sessionId);
        const savedState = await window.DatabaseService.loadGameStateBySessionId(gameId);
        
        if (!savedState) {
            loadingDiv.style.display = 'none';
            console.error('Failed to load game state. Document ID:', gameId);
            alert('Could not load the selected game. It may have been deleted or the session expired.');
            return;
        }
        
        console.log('Game state loaded successfully:', savedState);
        console.log('Current location index:', savedState.currentLocationIndex);
        console.log('Player name:', savedState.playerName);
        console.log('Score:', savedState.score);
        
        // Close modal first
        closeResumeGameModal();
        
        // Directly restore game engine state
        try {
            gameEngine.restoreState(savedState);
            currentPlayerType = savedState.playerType || 'solo';
            
            console.log('Game engine restored successfully');
            
            // Update UI
            updateScoreDisplay(gameEngine.getScore());
            updateTimerDisplay(gameEngine.elapsedTime);
            updateLocationsPanel();
            
            // Restore and resume timer
            // If game is in progress (past starting point), always resume timer
            if (savedState.currentLocationIndex > 0) {
                const now = Date.now();
                const savedElapsedTime = savedState.elapsedTime || 0;
                const savedTotalPauseTime = savedState.totalPauseTime || 0;
                
                // Restore timer state - don't add any time that passed while disconnected
                // Just resume from the saved elapsed time
                gameEngine.elapsedTime = savedElapsedTime;
                gameEngine.totalPauseTime = savedTotalPauseTime;
                
                // Calculate start time so timer continues from saved elapsed time
                // Formula in game engine: elapsed = (now - startTime - totalPauseTime) / 1000
                // We want: elapsed = savedElapsedTime (at resume time)
                // So: startTime = now - (savedElapsedTime * 1000) - (savedTotalPauseTime * 1000)
                gameEngine.startTime = now - (savedElapsedTime * 1000) - (savedTotalPauseTime * 1000);
                
                if (savedState.isTimerPaused) {
                    // Timer was paused (e.g., viewing titbits) - restore pause state
                    gameEngine.isTimerRunning = true;
                    gameEngine.isTimerPaused = true;
                    gameEngine.pauseStartTime = savedState.pauseStartTime || now;
                    console.log('Timer restored - was paused, elapsed time:', gameEngine.elapsedTime);
                } else {
                    // Timer should be running - resume it from saved elapsed time
                    gameEngine.isTimerRunning = true;
                    gameEngine.isTimerPaused = false;
                    gameEngine.pauseStartTime = null;
                    
                    // Stop any existing timer interval
                    if (gameEngine.timerInterval) {
                        clearInterval(gameEngine.timerInterval);
                        gameEngine.timerInterval = null;
                    }
                    
                    // Start the timer - this will continue counting from saved elapsed time
                    gameEngine.updateTimer();
                    console.log('Timer resumed from:', gameEngine.elapsedTime, 'seconds');
                }
                
                // Update timer display immediately with saved elapsed time
                updateTimerDisplay(gameEngine.elapsedTime);
            } else {
                // At starting point - timer hasn't started yet
                gameEngine.elapsedTime = 0;
                gameEngine.isTimerRunning = false;
                gameEngine.isTimerPaused = false;
                updateTimerDisplay(0);
                console.log('Timer not started - at starting point');
            }
            
            // Show appropriate screen based on current location
            if (savedState.currentLocationIndex === 0) {
                showScreen('starting-point-screen');
                document.getElementById('starting-location-name').textContent = gameData.startingLocation.name;
                document.getElementById('starting-location-address').textContent = gameData.startingLocation.address;
            } else {
                showScreen('game-screen');
                loadCurrentLocation();
            }
            
            // Start auto-save if not already running
            startAutoSave();
            
        } catch (restoreError) {
            console.error('Error restoring game state:', restoreError);
            alert('Error restoring game: ' + (restoreError.message || 'Please try again.'));
        }
        
    } catch (error) {
        console.error('Error resuming game:', error);
        loadingDiv.style.display = 'none';
        alert('Error loading game: ' + (error.message || 'Please try again.'));
    }
}

// Format time helper for resume modal
function formatTimeForResume(seconds) {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Character System Functions

// Show character introduction
function showCharacterIntroduction(playerName, groupSize) {
    const characterIntroText = document.getElementById('character-intro-text');
    // Use actual player name (individual player name, not team name or booking name)
    const actualPlayerName = gameEngine.individualPlayerName || playerName;
    const greeting = `Greetings, ${actualPlayerName}!`;
    
    characterIntroText.innerHTML = `
        ${greeting} I am <strong>Master Archibald</strong>, the keeper of this temporal treasure hunt and master of this game.<br><br>
        Through my time-traveling mechanisms and steampunk contraptions, I have crafted this journey across the centuries for you.<br><br>
        Your quest: Follow the clues, solve the puzzles, and discover the letter left behind. I shall be your guide, appearing when you need assistance or when you achieve great feats.<br><br>
        <em>Remember: You start with 100 bonus points. Each correct answer earns you 100 points. Hints cost points, but wisdom often comes at a price!</em><br><br>
        Are you ready to begin this adventure through time?
    `;
    
    document.getElementById('character-intro-modal').classList.add('active');
}

// Close character introduction
function closeCharacterIntro() {
    document.getElementById('character-intro-modal').classList.remove('active');
    
    // Show starting point screen after introduction
    showScreen('starting-point-screen');
    
    // Update starting location info
    document.getElementById('starting-location-name').textContent = gameData.startingLocation.name;
    document.getElementById('starting-location-address').textContent = gameData.startingLocation.address;
}

// Show character popup (for hints and messages)
function showCharacterPopup(message, hintText, isMapHint, isMotivational) {
    // Don't show Archibald messages if we're on the final screen
    const finalScreen = document.getElementById('final-screen');
    if (finalScreen && finalScreen.classList.contains('active')) {
        return; // Exit early if final screen is active
    }
    
    showCharacterPopupWithCallback(message, hintText, isMapHint, isMotivational, null);
}

// Show character popup with callback (for when we need to continue after popup closes)
let characterPopupCallback = null;

function showCharacterPopupWithCallback(message, hintText, isMapHint, isMotivational, callback) {
    // Don't show Archibald messages if we're on the final screen
    const finalScreen = document.getElementById('final-screen');
    if (finalScreen && finalScreen.classList.contains('active')) {
        return; // Exit early if final screen is active
    }
    
    const popupText = document.getElementById('character-popup-text');
    const hintContent = document.getElementById('character-hint-content');
    const hintTextElement = document.getElementById('character-hint-text');
    const mapHintContainer = document.getElementById('character-map-hint-container');
    const mapIframe = document.getElementById('character-map-iframe');
    
    popupText.textContent = message;
    
    if (hintText) {
        hintContent.style.display = 'block';
        hintTextElement.textContent = hintText;
        hintTextElement.style.display = 'block'; // Ensure hint text is visible
        
        if (isMapHint) {
            mapHintContainer.style.display = 'block';
            hintTextElement.style.display = 'none'; // Hide text hint when showing map
            if (mapIframe && hintText.startsWith('http')) {
                // If hintText is actually a map URL
                mapIframe.src = hintText;
            }
        } else {
            mapHintContainer.style.display = 'none';
            hintTextElement.style.display = 'block'; // Show text hint when not a map hint
        }
    } else {
        hintContent.style.display = 'none';
    }
    
    // Store callback
    characterPopupCallback = callback;
    
    document.getElementById('character-popup-modal').classList.add('active');
}

// Show character popup with map (for map hints)
function showCharacterPopupWithMap(message, mapUrl, isMotivational) {
    // Don't show Archibald messages if we're on the final screen
    const finalScreen = document.getElementById('final-screen');
    if (finalScreen && finalScreen.classList.contains('active')) {
        return; // Exit early if final screen is active
    }
    
    const popupText = document.getElementById('character-popup-text');
    const hintContent = document.getElementById('character-hint-content');
    const hintTextElement = document.getElementById('character-hint-text');
    const mapHintContainer = document.getElementById('character-map-hint-container');
    const mapIframe = document.getElementById('character-map-iframe');
    
    popupText.textContent = message;
    
    if (mapUrl) {
        hintContent.style.display = 'block';
        hintTextElement.style.display = 'none'; // Hide text hint element for map hints
        mapHintContainer.style.display = 'block';
        if (mapIframe) {
            mapIframe.src = mapUrl;
        }
    } else {
        hintContent.style.display = 'none';
    }
    
    document.getElementById('character-popup-modal').classList.add('active');
}

// Close character popup
async function closeCharacterPopup() {
    document.getElementById('character-popup-modal').classList.remove('active');
    
    // Execute callback if provided
    if (characterPopupCallback) {
        const callback = characterPopupCallback;
        characterPopupCallback = null;
        callback();
    }
    
    // If we were waiting to start gameplay, continue now
    if (waitingForGameplayStart) {
        waitingForGameplayStart = false;
        
        // Start timer
        gameEngine.startTimer();
        
        // Move to first location
        gameEngine.nextLocation();
        
        // Save initial game state
        await saveGameState();
        
        // Show game screen
        showScreen('game-screen');
        
        // Load first location with page turn animation
        loadCurrentLocation();
    }
}

// Show support popup
function showSupportPopup() {
    const supportModal = document.getElementById('support-popup-modal');
    if (supportModal) {
        supportModal.classList.add('active');
    }
}

// Close support popup
function closeSupportPopup() {
    const supportModal = document.getElementById('support-popup-modal');
    if (supportModal) {
        supportModal.classList.remove('active');
    }
}

// Close support popup when clicking outside
document.addEventListener('click', function(event) {
    const supportModal = document.getElementById('support-popup-modal');
    if (supportModal && event.target === supportModal) {
        closeSupportPopup();
    }
});

// Get motivational message based on progress
function getMotivationalMessage(currentLocation, totalLocations) {
    const progress = currentLocation / totalLocations;
    // Use actual player name (individual player name, not team name or booking name)
    const playerName = gameEngine.individualPlayerName || gameEngine.playerName;
    
    let message = '';
    
    if (currentLocation === 1) {
        message = `Excellent work, ${playerName}! You've found your first location. The journey has truly begun!`;
    } else if (currentLocation === Math.floor(totalLocations / 2)) {
        message = `Magnificent progress, ${playerName}! You're halfway through your quest. The letter left behind draws nearer!`;
    } else if (currentLocation === totalLocations - 1) {
        message = `Outstanding, ${playerName}! You're on the final stretch. The letter left behind awaits at your next destination!`;
    } else if (currentLocation === totalLocations) {
        message = `Congratulations, ${playerName}! You've completed the entire journey! The letter left behind is yours to discover!`;
    } else if (progress < 0.3) {
        const messages = [
            `Well done, ${playerName}! You're making excellent progress. Keep up the momentum!`,
            `Splendid work, ${playerName}! Each location brings you closer to the mystery.`,
            `Bravo, ${playerName}! Your determination is admirable. Continue forward!`
        ];
        message = messages[Math.floor(Math.random() * messages.length)];
    } else if (progress < 0.7) {
        const messages = [
            `Impressive, ${playerName}! You're navigating this temporal puzzle with great skill!`,
            `Excellent progress, ${playerName}! The pieces of the puzzle are coming together.`,
            `Outstanding work, ${playerName}! You're proving yourself a worthy time traveler!`
        ];
        message = messages[Math.floor(Math.random() * messages.length)];
    } else {
        const messages = [
            `Remarkable, ${playerName}! You're so close to uncovering the secret!`,
            `Extraordinary work, ${playerName}! The final revelation approaches!`,
            `Brilliant, ${playerName}! Your journey through time is nearly complete!`
        ];
        message = messages[Math.floor(Math.random() * messages.length)];
    }
    
    return { message };
}
