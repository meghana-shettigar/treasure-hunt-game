// Game Engine - Handles game state, timer, scoring, and game logic

class GameEngine {
    constructor() {
        this.currentLocationIndex = 0; // 0 = starting point, 1-10 = locations
        this.score = 100; // Start with 100 points so hints can be used on first location
        this.startTime = null;
        this.elapsedTime = 0;
        this.timerInterval = null;
        this.isTimerRunning = false;
        this.isTimerPaused = false;
        this.pauseStartTime = null;
        this.totalPauseTime = 0;
        this.playerName = '';
        this.groupMembers = [];
        this.personalMessage = '';
        this.hintsUsed = {
            textHints: new Set(),
            mapHints: new Set()
        };
        this.answersSubmitted = new Set();
        this.locationNamesSubmitted = new Set(); // Track location names that have been correctly identified
        this.completedLocations = []; // Track completed locations with their names and answers
        // Game access control fields
        this.bookingId = null;
        this.bookingDate = null;
        this.bookingTime = null;
        this.gameStatus = 'pending'; // pending, active, completed, abandoned
        this.lastPlayedAt = null;
    }

    // Initialize game with player data
    initialize(playerName, groupSize, groupNames, personalMessage) {
        this.playerName = playerName;
        // Personal message will be fetched from database when showing final screen
        // Store it if provided, otherwise it will be fetched later
        this.personalMessage = personalMessage || null;
        if (groupSize === 'group' && groupNames) {
            this.groupMembers = groupNames.split(',').map(name => name.trim()).filter(name => name);
        } else {
            this.groupMembers = [];
        }
    }

    // Start the timer when player arrives at starting point
    startTimer() {
        if (!this.isTimerRunning && !this.isTimerPaused) {
            this.startTime = Date.now();
            this.isTimerRunning = true;
            this.totalPauseTime = 0;
            this.updateTimer();
        }
    }

    // Update timer display
    updateTimer() {
        if (!this.isTimerRunning) return;

        this.timerInterval = setInterval(() => {
            if (!this.isTimerPaused && this.isTimerRunning) {
                const now = Date.now();
                const elapsed = now - this.startTime - this.totalPauseTime;
                this.elapsedTime = Math.floor(elapsed / 1000);
                this.onTimerUpdate(this.elapsedTime);
            }
        }, 1000);
    }

    // Pause timer (for titbits screen)
    pauseTimer() {
        if (this.isTimerRunning && !this.isTimerPaused) {
            this.isTimerPaused = true;
            this.pauseStartTime = Date.now();
        }
    }

    // Resume timer
    resumeTimer() {
        if (this.isTimerRunning && this.isTimerPaused) {
            const pauseDuration = Date.now() - this.pauseStartTime;
            this.totalPauseTime += pauseDuration;
            this.isTimerPaused = false;
            this.pauseStartTime = null;
        }
    }

    // Stop timer (when game ends)
    stopTimer() {
        this.isTimerRunning = false;
        this.isTimerPaused = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        // Calculate final elapsed time
        if (this.startTime) {
            const now = Date.now();
            this.elapsedTime = Math.floor((now - this.startTime - this.totalPauseTime) / 1000);
        }
    }

    // Format time as MM:SS
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Get current formatted time
    getFormattedTime() {
        return this.formatTime(this.elapsedTime);
    }

    // Move to next location
    nextLocation() {
        if (this.currentLocationIndex < gameData.locations.length) {
            this.currentLocationIndex++;
            return true;
        }
        return false;
    }

    // Get current location data
    getCurrentLocation() {
        if (this.currentLocationIndex === 0) {
            return null; // Starting point
        }
        return gameData.locations[this.currentLocationIndex - 1];
    }

    // Get clue for current location
    getCurrentClue() {
        const location = this.getCurrentLocation();
        return location ? location.clue : null;
    }

    // Get question for current location
    getCurrentQuestion() {
        const location = this.getCurrentLocation();
        return location ? location.question : null;
    }

    // Get correct answer for current question (for text input)
    getCurrentCorrectAnswer() {
        const location = this.getCurrentLocation();
        return location ? location.correctAnswer : null;
    }

    // Validate location name
    validateLocationName(locationName) {
        const location = this.getCurrentLocation();
        if (!location) return false;
        
        // Normalize input: remove wildcards and convert to lowercase
        const normalizedInput = this.normalizeAnswer(locationName);
        const variations = location.locationNameVariations || [];
        
        // Check against all variations
        for (const variation of variations) {
            const normalizedVariation = this.normalizeAnswer(variation);
            if (normalizedInput === normalizedVariation) {
                return true;
            }
        }
        
        // Also check against the main location name
        const normalizedLocationName = this.normalizeAnswer(location.locationName);
        if (normalizedInput === normalizedLocationName) {
            return true;
        }
        
        return false;
    }

    // Submit location name
    submitLocationName(locationName) {
        const location = this.getCurrentLocation();
        if (!location || this.locationNamesSubmitted.has(location.id)) {
            return false;
        }

        const isValid = this.validateLocationName(locationName);
        if (isValid) {
            this.locationNamesSubmitted.add(location.id);
            return { correct: true };
        } else {
            return { correct: false };
        }
    }

    // Normalize string: remove wildcard characters, articles, spaces, apostrophes and convert to lowercase
    normalizeAnswer(answerText) {
        if (!answerText) return '';
        
        let normalized = answerText.toString();
        
        // Remove all apostrophe types (making apostrophes optional)
        // Handle straight apostrophe, curly apostrophes (U+2018, U+2019), backticks, and acute accents
        normalized = normalized.replace(/[''`´]/g, '');
        
        // Remove wildcard characters: *, ?, [, ], {, }, ^, $, |, \, /, etc.
        const wildcardPattern = /[*?\[\]{}^$|\\\/]/g;
        normalized = normalized.trim().toLowerCase().replace(wildcardPattern, '');
        
        // Remove articles: "the", "a", "an" (as whole words)
        normalized = normalized.replace(/\b(the|a|an)\b/g, '');
        
        // Remove all spaces
        normalized = normalized.replace(/\s+/g, '');
        
        return normalized.trim();
    }

    // Submit answer and update score (text-based)
    submitAnswer(answerText) {
        const location = this.getCurrentLocation();
        if (!location) {
            return false;
        }
        
        // Allow multiple attempts - don't check if answer was already submitted

        // Normalize input: remove wildcards, spaces, articles and convert to lowercase
        const normalizedInput = this.normalizeAnswer(answerText);
        
        // Check against the main correct answer only (after normalization)
        let isCorrect = false;
        if (location.correctAnswer) {
            const normalizedCorrectAnswer = this.normalizeAnswer(location.correctAnswer);
            
            // Debug logging for location 9 (Queen Eleanor's Cross)
            if (location.id === 9) {
                console.log('Location 9 Answer Check:');
                console.log('  User input:', answerText);
                console.log('  Normalized input:', normalizedInput);
                console.log('  Correct answer:', location.correctAnswer);
                console.log('  Normalized correct:', normalizedCorrectAnswer);
                console.log('  Match:', normalizedInput === normalizedCorrectAnswer);
            }
            
            if (normalizedInput === normalizedCorrectAnswer) {
                isCorrect = true;
            }
        }

        if (isCorrect) {
            // Only add to completed locations if not already there
            if (!this.answersSubmitted.has(location.id)) {
                this.answersSubmitted.add(location.id);
                // Add location to completed locations list
                this.completedLocations.push({
                    id: location.id,
                    name: location.locationName || location.name,
                    answer: location.correctAnswer
                });
                
                this.addScore(100);
                return { correct: true, points: 100 };
            } else {
                // Already answered correctly, don't add points again
                return { correct: true, points: 0 };
            }
        } else {
            return { correct: false, points: 0 };
        }
    }

    // Get completed locations for the pinned panel
    getCompletedLocations() {
        return this.completedLocations;
    }

    // Check if location name has been submitted for current location
    hasSubmittedLocationName() {
        const location = this.getCurrentLocation();
        return location ? this.locationNamesSubmitted.has(location.id) : false;
    }

    // Use text hint
    useTextHint() {
        const location = this.getCurrentLocation();
        if (!location) {
            return null;
        }

        const alreadyUsed = this.hintsUsed.textHints.has(location.id);
        
        if (!alreadyUsed) {
            this.hintsUsed.textHints.add(location.id);
            this.addScore(-30);
        }
        
        return location.textHint;
    }

    // Use map hint
    useMapHint() {
        const location = this.getCurrentLocation();
        if (!location) {
            return null;
        }

        const alreadyUsed = this.hintsUsed.mapHints.has(location.id);
        
        if (!alreadyUsed) {
            this.hintsUsed.mapHints.add(location.id);
            this.addScore(-50);
        }
        
        return {
            mapUrl: location.mapHint, // Google Maps embed URL
            locationName: location.name
        };
    }

    // Check if text hint has been used for current location
    hasUsedTextHint() {
        const location = this.getCurrentLocation();
        return location ? this.hintsUsed.textHints.has(location.id) : false;
    }

    // Check if map hint has been used for current location
    hasUsedMapHint() {
        const location = this.getCurrentLocation();
        return location ? this.hintsUsed.mapHints.has(location.id) : false;
    }

    // Add to score
    addScore(points) {
        this.score = Math.max(0, this.score + points);
        this.onScoreUpdate(this.score);
    }

    // Get current score
    getScore() {
        return this.score;
    }

    // Get current location number (1-10)
    getCurrentLocationNumber() {
        return this.currentLocationIndex;
    }

    // Check if game is complete
    isGameComplete() {
        return this.currentLocationIndex === gameData.locations.length;
    }

    // Get final stats
    getFinalStats() {
        // If personal message is not set, return a placeholder (it should be fetched before calling this)
        const message = this.personalMessage || 'Loading your personal message...';
        return {
            time: this.getFormattedTime(),
            score: this.score,
            personalMessage: message
        };
    }

    // Reset game
    reset() {
        this.currentLocationIndex = 0;
        this.score = 100; // Reset to 100 points (starting bonus)
        this.startTime = null;
        this.elapsedTime = 0;
        this.isTimerRunning = false;
        this.isTimerPaused = false;
        this.pauseStartTime = null;
        this.totalPauseTime = 0;
        this.hintsUsed = {
            textHints: new Set(),
            mapHints: new Set()
        };
        this.answersSubmitted = new Set();
        this.locationNamesSubmitted = new Set();
        this.completedLocations = [];
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    // Restore game state from saved data (with guardrail: never skip ahead in sequence)
    restoreState(stateData) {
        if (!stateData) return false;

        let index = stateData.currentLocationIndex || 0;
        const completedCount = (stateData.completedLocations || []).length;
        const maxIndex = typeof gameData !== 'undefined' && gameData.locations
            ? gameData.locations.length
            : 10;
        // Ensure we never show a location we haven't reached in sequence (prevents skipped locations)
        this.currentLocationIndex = Math.min(index, completedCount + 1, maxIndex);
        this.currentLocationIndex = Math.max(0, this.currentLocationIndex);
        this.score = stateData.score || 0;
        this.startTime = stateData.startTime || null;
        this.elapsedTime = stateData.elapsedTime || 0;
        this.isTimerRunning = stateData.isTimerRunning || false;
        this.isTimerPaused = stateData.isTimerPaused || false;
        this.pauseStartTime = stateData.pauseStartTime || null;
        this.totalPauseTime = stateData.totalPauseTime || 0;
        this.playerName = stateData.playerName || '';
        this.groupMembers = stateData.groupMembers || [];
        this.individualPlayerName = stateData.individualPlayerName || null; // Restore individual player name for Archibald references
        this.completedLocations = stateData.completedLocations || [];
        
        // Restore Sets
        this.hintsUsed = {
            textHints: stateData.hintsUsed?.textHints instanceof Set 
                ? stateData.hintsUsed.textHints 
                : new Set(stateData.hintsUsed?.textHints || []),
            mapHints: stateData.hintsUsed?.mapHints instanceof Set 
                ? stateData.hintsUsed.mapHints 
                : new Set(stateData.hintsUsed?.mapHints || [])
        };
        this.answersSubmitted = stateData.answersSubmitted instanceof Set 
            ? stateData.answersSubmitted 
            : new Set(stateData.answersSubmitted || []);
        this.locationNamesSubmitted = stateData.locationNamesSubmitted instanceof Set 
            ? stateData.locationNamesSubmitted 
            : new Set(stateData.locationNamesSubmitted || []);

        return true;
    }

    // Get current state as object (for saving)
    getState() {
        return {
            currentLocationIndex: this.currentLocationIndex,
            score: this.score,
            startTime: this.startTime,
            elapsedTime: this.elapsedTime,
            isTimerRunning: this.isTimerRunning,
            isTimerPaused: this.isTimerPaused,
            pauseStartTime: this.pauseStartTime,
            totalPauseTime: this.totalPauseTime,
            playerName: this.playerName,
            groupMembers: this.groupMembers,
            completedLocations: this.completedLocations,
            hintsUsed: this.hintsUsed,
            answersSubmitted: this.answersSubmitted,
            locationNamesSubmitted: this.locationNamesSubmitted,
            // Game access control fields
            bookingId: this.bookingId,
            bookingDate: this.bookingDate,
            bookingTime: this.bookingTime,
            gameStatus: this.gameStatus,
            lastPlayedAt: this.lastPlayedAt
        };
    }

    // Callbacks (to be set by app.js)
    onTimerUpdate(time) {}
    onScoreUpdate(score) {}
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameEngine;
}