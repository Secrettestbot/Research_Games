/**
 * ============================================================================
 * EXPERIMENT 1: DIGITAL TREASURE HUNT - jsPsych Web Implementation
 * ============================================================================
 *
 * Description:
 *   Web-based version of the Treasure Hunt experiment using jsPsych 7.x
 *   Tests Festinger's Cognitive Dissonance vs Capaldi's Sequential Theory
 *
 * Requirements:
 *   - jsPsych 7.x (https://www.jspsych.org/)
 *   - jsPsych plugins: html-keyboard-response, html-button-response, survey
 *   - Web server with backend for data storage
 *
 * Author: Research Games Project
 * Date: January 2025
 * ============================================================================
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    // Experiment parameters
    experiment_name: 'TreasureHunt',
    version: '1.0.0',

    // Trial counts
    n_practice: 5,
    n_acquisition: 20,
    n_extinction_max: 30,

    // Timing (milliseconds)
    card_display_time: 500,
    outcome_display_time: 1500,
    iti: 300,

    // Clicks required
    clicks_baseline: 3,
    clicks_high_effort: 10,
    click_timeout: 10000,

    // Rewards
    coins_per_chest: 5,

    // Conditions
    conditions: ['BASELINE', 'HIGH_EFFORT', 'NR_PATTERN', 'RN_PATTERN']
};

// ============================================================================
// SEQUENCE GENERATORS
// ============================================================================

/**
 * Generate randomized sequence for BASELINE/HIGH_EFFORT conditions
 * @param {number} nTrials - Total trials
 * @param {number} nRewards - Number of rewarded trials
 * @returns {Array} Array of 1s (coin) and 0s (empty)
 */
function generateRandomSequence(nTrials = 20, nRewards = 10) {
    const sequence = Array(nRewards).fill(1).concat(Array(nTrials - nRewards).fill(0));
    // Fisher-Yates shuffle
    for (let i = sequence.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
    }
    return sequence;
}

/**
 * Generate N→R alternating sequence
 * Pattern: 0,1,0,1,0,1... (empty, coin, empty, coin...)
 */
function generateNRSequence(nTrials = 20) {
    return Array.from({length: nTrials}, (_, i) => i % 2);
}

/**
 * Generate R→N alternating sequence
 * Pattern: 1,0,1,0,1,0... (coin, empty, coin, empty...)
 */
function generateRNSequence(nTrials = 20) {
    return Array.from({length: nTrials}, (_, i) => 1 - (i % 2));
}

/**
 * Get sequence based on condition
 */
function getSequenceForCondition(condition) {
    switch(condition) {
        case 'BASELINE':
        case 'HIGH_EFFORT':
            return generateRandomSequence();
        case 'NR_PATTERN':
            return generateNRSequence();
        case 'RN_PATTERN':
            return generateRNSequence();
        default:
            throw new Error(`Unknown condition: ${condition}`);
    }
}

/**
 * Get clicks required based on condition and outcome
 */
function getClicksRequired(condition, outcome) {
    if (condition === 'HIGH_EFFORT' && outcome === 1) {
        return CONFIG.clicks_high_effort;
    }
    return CONFIG.clicks_baseline;
}

// ============================================================================
// EXPERIMENT DATA
// ============================================================================

let experimentData = {
    participant_id: null,
    condition: null,
    start_time: null,
    practice_trials: [],
    acquisition_trials: [],
    extinction_trials: [],
    total_coins: 0,
    survey_responses: {}
};

// ============================================================================
// CUSTOM PLUGINS
// ============================================================================

/**
 * Custom jsPsych plugin for the chest-clicking trial
 */
const chestClickPlugin = {
    info: {
        name: 'chest-click',
        parameters: {
            clicks_required: {
                type: jsPsych.ParameterType.INT,
                default: 3
            },
            outcome: {
                type: jsPsych.ParameterType.INT,
                default: 0  // 0 = empty, 1 = coin
            },
            show_quit_button: {
                type: jsPsych.ParameterType.BOOL,
                default: false
            },
            trial_number: {
                type: jsPsych.ParameterType.INT,
                default: 1
            },
            total_coins: {
                type: jsPsych.ParameterType.INT,
                default: 0
            }
        }
    },

    trial: function(display_element, trial) {
        let clickCount = 0;
        let startTime = performance.now();
        let quitPressed = false;

        // Build HTML
        let html = `
            <div class="treasure-hunt-container">
                <div class="header">
                    <span class="trial-counter">Chest ${trial.trial_number}</span>
                    <span class="coin-counter">🪙 ${trial.total_coins} coins</span>
                </div>

                <div class="chest-area">
                    <div class="chest" id="chest">
                        <div class="chest-body">📦</div>
                        <div class="chest-label">Click to open!</div>
                    </div>
                </div>

                <div class="progress-container">
                    <div class="progress-bar" id="progress-bar" style="width: 0%"></div>
                </div>
                <div class="progress-text" id="progress-text">
                    Clicks: 0 / ${trial.clicks_required}
                </div>
        `;

        if (trial.show_quit_button) {
            html += `
                <button class="quit-button" id="quit-button">
                    I'M DONE HUNTING
                </button>
            `;
        }

        html += `</div>`;

        display_element.innerHTML = html;

        // Add styles
        const styles = `
            <style>
                .treasure-hunt-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 80vh;
                    font-family: Arial, sans-serif;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    width: 100%;
                    max-width: 400px;
                    margin-bottom: 20px;
                }
                .coin-counter {
                    font-size: 24px;
                    color: #f1c40f;
                }
                .trial-counter {
                    font-size: 18px;
                    color: #7f8c8d;
                }
                .chest-area {
                    margin: 40px 0;
                }
                .chest {
                    font-size: 100px;
                    cursor: pointer;
                    user-select: none;
                    transition: transform 0.1s;
                    text-align: center;
                }
                .chest:hover {
                    transform: scale(1.05);
                }
                .chest:active {
                    transform: scale(0.95);
                }
                .chest-label {
                    font-size: 18px;
                    color: #2c3e50;
                    margin-top: 10px;
                }
                .progress-container {
                    width: 300px;
                    height: 20px;
                    background: #ecf0f1;
                    border-radius: 10px;
                    overflow: hidden;
                    margin: 20px 0;
                }
                .progress-bar {
                    height: 100%;
                    background: #3498db;
                    transition: width 0.1s;
                }
                .progress-text {
                    font-size: 16px;
                    color: #7f8c8d;
                }
                .quit-button {
                    margin-top: 40px;
                    padding: 15px 30px;
                    font-size: 16px;
                    background: #e74c3c;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .quit-button:hover {
                    background: #c0392b;
                }
                .outcome {
                    font-size: 48px;
                    text-align: center;
                    margin: 40px 0;
                }
                .outcome.coin {
                    color: #f1c40f;
                }
                .outcome.empty {
                    color: #e74c3c;
                }
            </style>
        `;
        display_element.innerHTML = styles + display_element.innerHTML;

        // Event handlers
        const chest = document.getElementById('chest');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');

        function handleClick(e) {
            if (e.target.closest('#quit-button')) return;

            clickCount++;
            const progress = (clickCount / trial.clicks_required) * 100;
            progressBar.style.width = `${Math.min(progress, 100)}%`;
            progressText.textContent = `Clicks: ${clickCount} / ${trial.clicks_required}`;

            if (clickCount >= trial.clicks_required) {
                chest.removeEventListener('click', handleClick);
                showOutcome();
            }
        }

        function showOutcome() {
            const endTime = performance.now();
            const rt = endTime - startTime;

            let outcomeHtml;
            if (trial.outcome === 1) {
                outcomeHtml = `
                    <div class="outcome coin">
                        +${CONFIG.coins_per_chest} COINS! 🪙
                    </div>
                `;
            } else {
                outcomeHtml = `
                    <div class="outcome empty">
                        EMPTY ❌
                    </div>
                `;
            }

            display_element.innerHTML = styles + `
                <div class="treasure-hunt-container">
                    ${outcomeHtml}
                </div>
            `;

            setTimeout(() => {
                endTrial(rt, false);
            }, CONFIG.outcome_display_time);
        }

        function endTrial(rt, quit) {
            const data = {
                clicks: clickCount,
                clicks_required: trial.clicks_required,
                outcome: trial.outcome,
                rt: rt,
                completed: clickCount >= trial.clicks_required,
                quit_pressed: quit
            };

            jsPsych.finishTrial(data);
        }

        chest.addEventListener('click', handleClick);

        // Quit button handler
        if (trial.show_quit_button) {
            document.getElementById('quit-button').addEventListener('click', () => {
                quitPressed = true;
                endTrial(performance.now() - startTime, true);
            });
        }

        // Timeout
        setTimeout(() => {
            if (clickCount < trial.clicks_required && !quitPressed) {
                endTrial(CONFIG.click_timeout, false);
            }
        }, CONFIG.click_timeout);
    }
};

// ============================================================================
// TIMELINE CONSTRUCTION
// ============================================================================

/**
 * Build the complete experiment timeline
 */
function buildTimeline(condition) {
    const timeline = [];

    // Welcome
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <h1>🏴‍☠️ TREASURE HUNT! 🏴‍☠️</h1>
            <p>Welcome to the Treasure Hunt game!</p>
            <p>Your mission: Unlock treasure chests to collect gold coins.</p>
            <br>
            <p><strong>IMPORTANT RULES:</strong></p>
            <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
                <li>You'll have treasure chests to open</li>
                <li>Some chests contain <span style="color: #f1c40f;">5 GOLD COINS 🪙</span></li>
                <li>Some chests are <span style="color: #e74c3c;">EMPTY ❌</span></li>
                <li>Opening a chest takes work—you must click rapidly!</li>
            </ul>
            <br>
            <p>Your goal: Collect as many coins as possible.</p>
        `,
        choices: ["Let's begin!"]
    });

    // Practice instructions
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <h2>PRACTICE ROUND</h2>
            <p>Let's practice opening treasure chests!</p>
            <p>Click the chest repeatedly until it opens.</p>
            <p>You need about ${CONFIG.clicks_baseline} clicks.</p>
        `,
        choices: ['Start Practice']
    });

    // Practice trials
    const practiceOutcomes = [1, 0, 1, 1, 0];  // 3 coins, 2 empty
    let practiceCoins = 0;

    for (let i = 0; i < CONFIG.n_practice; i++) {
        timeline.push({
            type: chestClickPlugin,
            clicks_required: CONFIG.clicks_baseline,
            outcome: practiceOutcomes[i],
            show_quit_button: false,
            trial_number: i + 1,
            total_coins: practiceCoins,
            on_finish: function(data) {
                if (data.outcome === 1 && data.completed) {
                    practiceCoins += CONFIG.coins_per_chest;
                }
                experimentData.practice_trials.push(data);
            }
        });
    }

    // Transition to acquisition
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: function() {
            return `
                <h2>PRACTICE COMPLETE!</h2>
                <p>Great job! You collected ${practiceCoins} practice coins.</p>
                <p>Now the REAL treasure hunt begins!</p>
                <p>You'll have ${CONFIG.n_acquisition} treasure chests to open.</p>
                <p>Try to collect as many coins as possible!</p>
            `;
        },
        choices: ['Start Treasure Hunt']
    });

    // Acquisition phase
    const sequence = getSequenceForCondition(condition);

    for (let i = 0; i < CONFIG.n_acquisition; i++) {
        const outcome = sequence[i];
        const clicks = getClicksRequired(condition, outcome);

        timeline.push({
            type: chestClickPlugin,
            clicks_required: clicks,
            outcome: outcome,
            show_quit_button: false,
            trial_number: i + 1,
            total_coins: function() { return experimentData.total_coins; },
            on_finish: function(data) {
                if (data.outcome === 1 && data.completed) {
                    experimentData.total_coins += CONFIG.coins_per_chest;
                }
                data.condition = condition;
                data.phase = 'acquisition';
                experimentData.acquisition_trials.push(data);
            }
        });
    }

    // Transition to extinction
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: function() {
            return `
                <h2>PHASE 1 COMPLETE!</h2>
                <p>Excellent! You collected <strong>${experimentData.total_coins}</strong> gold coins!</p>
                <br>
                <p>Now you've discovered a <strong>NEW AREA</strong> with up to ${CONFIG.n_extinction_max} more chests.</p>
                <p>Keep opening chests—some MIGHT have coins, some MIGHT be empty.</p>
                <br>
                <p style="color: #e74c3c;"><strong>You can stop anytime by clicking "I'M DONE HUNTING"</strong></p>
            `;
        },
        choices: ['Continue Hunting']
    });

    // Extinction phase (conditional loop)
    const extinctionLoop = {
        timeline: [{
            type: chestClickPlugin,
            clicks_required: CONFIG.clicks_baseline,
            outcome: 0,  // All empty in extinction
            show_quit_button: true,
            trial_number: function() {
                return experimentData.extinction_trials.length + 1;
            },
            total_coins: function() { return experimentData.total_coins; },
            on_finish: function(data) {
                data.condition = condition;
                data.phase = 'extinction';
                experimentData.extinction_trials.push(data);
            }
        }],
        loop_function: function(data) {
            const lastTrial = data.values()[0];
            // Stop if quit pressed or max trials reached
            if (lastTrial.quit_pressed || experimentData.extinction_trials.length >= CONFIG.n_extinction_max) {
                return false;
            }
            return true;
        }
    };

    timeline.push(extinctionLoop);

    // Survey (abbreviated for this example)
    timeline.push({
        type: jsPsychSurvey,
        pages: [
            [
                {
                    type: 'text',
                    prompt: 'In Phase 2 (Extended Hunt), how many COINS did you find total?',
                    name: 'attention_check',
                    required: true
                }
            ],
            [
                {
                    type: 'likert',
                    prompt: 'How predictable were the chests?',
                    name: 'predictability',
                    likert_scale_min: 1,
                    likert_scale_max: 7,
                    likert_scale_min_label: 'Completely Random',
                    likert_scale_max_label: 'Very Predictable'
                },
                {
                    type: 'likert',
                    prompt: 'How valuable were the coins to you?',
                    name: 'coin_value',
                    likert_scale_min: 1,
                    likert_scale_max: 7,
                    likert_scale_min_label: 'Not at all valuable',
                    likert_scale_max_label: 'Extremely valuable'
                }
            ]
        ],
        on_finish: function(data) {
            experimentData.survey_responses = data.response;
        }
    });

    // Debrief
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: function() {
            const extinctionCount = experimentData.extinction_trials.length;
            return `
                <h2>THANK YOU!</h2>
                <p>Study Complete!</p>
                <br>
                <p>You collected <strong>${experimentData.total_coins}</strong> coins in Phase 1.</p>
                <p>You opened <strong>${extinctionCount}</strong> chests in Phase 2.</p>
                <br>
                <h3>ABOUT THIS STUDY:</h3>
                <p>We're testing two theories about persistence:</p>
                <ol style="text-align: left; max-width: 500px; margin: 0 auto;">
                    <li><strong>Festinger's Theory:</strong> Does EFFORT make rewards more valuable?</li>
                    <li><strong>Capaldi's Theory:</strong> Do PATTERNS create expectations?</li>
                </ol>
                <br>
                <p>In Phase 2, all chests were actually empty.<br>
                We wanted to see how long you'd keep trying.</p>
                <br>
                <p>Thank you for contributing to science!</p>
            `;
        },
        choices: ['Finish']
    });

    return timeline;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize and run the experiment
 */
function runExperiment() {
    // Get condition (could be from URL param or random assignment)
    const urlParams = new URLSearchParams(window.location.search);
    let condition = urlParams.get('condition');

    if (!condition || !CONFIG.conditions.includes(condition)) {
        // Random assignment
        condition = CONFIG.conditions[Math.floor(Math.random() * CONFIG.conditions.length)];
    }

    // Generate participant ID
    const participantId = `P${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    experimentData.participant_id = participantId;
    experimentData.condition = condition;
    experimentData.start_time = new Date().toISOString();

    // Register custom plugin
    jsPsych.extensions = {};

    // Initialize jsPsych
    const jsPsych = initJsPsych({
        on_finish: function() {
            experimentData.end_time = new Date().toISOString();
            experimentData.extinction_chests_opened = experimentData.extinction_trials.filter(t => t.completed).length;

            // Save data to server
            saveData(experimentData);

            // Show data (for debugging)
            console.log('Experiment data:', experimentData);
        }
    });

    // Build and run timeline
    const timeline = buildTimeline(condition);
    jsPsych.run(timeline);
}

/**
 * Save data to server
 */
async function saveData(data) {
    try {
        const response = await fetch('/api/save-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Failed to save data');
        }

        console.log('Data saved successfully');
    } catch (error) {
        console.error('Error saving data:', error);
        // Fallback: download as JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `treasure_hunt_${data.participant_id}.json`;
        a.click();
    }
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', runExperiment);
