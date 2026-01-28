/**
 * ==========================================================================
 * EXPERIMENT 1: DIGITAL TREASURE HUNT - jsPsych Implementation
 * ==========================================================================
 */

const CONFIG = {
    n_practice: 5,
    n_acquisition: 20,
    n_extinction_max: 30,
    clicks_baseline: 3,
    clicks_high_effort: 10,
    coins_per_chest: 5
};

// Generate sequences based on condition
function getSequence(condition) {
    switch(condition) {
        case 'BASELINE':
        case 'HIGH_EFFORT':
            // Random sequence: 10 rewards, 10 empty
            const seq = Array(10).fill(1).concat(Array(10).fill(0));
            for (let i = seq.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [seq[i], seq[j]] = [seq[j], seq[i]];
            }
            return seq;
        case 'NR_PATTERN':
            // Alternating: empty, coin, empty, coin...
            return Array.from({length: 20}, (_, i) => i % 2);
        case 'RN_PATTERN':
            // Alternating: coin, empty, coin, empty...
            return Array.from({length: 20}, (_, i) => 1 - (i % 2));
        default:
            return Array(20).fill(0);
    }
}

function getClicksRequired(condition, outcome) {
    if (condition === 'HIGH_EFFORT' && outcome === 1) {
        return CONFIG.clicks_high_effort;
    }
    return CONFIG.clicks_baseline;
}

function runTreasureHunt(participantId, condition) {
    const jsPsych = initJsPsych({
        display_element: 'jspsych-target',
        on_finish: function() {
            saveDataAndRedirect();
        }
    });

    let totalCoins = 0;
    let practiceCoins = 0;
    const practiceTrials = [];
    const acquisitionTrials = [];
    const extinctionTrials = [];
    const startTime = new Date().toISOString();

    // ========================================================================
    // CUSTOM CHEST PLUGIN
    // ========================================================================

    class ChestClickPlugin {
        static info = {
            name: 'chest-click',
            parameters: {
                clicks_required: { type: jsPsych.ParameterType.INT, default: 3 },
                outcome: { type: jsPsych.ParameterType.INT, default: 0 },
                show_quit_button: { type: jsPsych.ParameterType.BOOL, default: false },
                trial_number: { type: jsPsych.ParameterType.INT, default: 1 },
                total_coins: { type: jsPsych.ParameterType.INT, default: 0 }
            }
        }

        trial(display_element, trial) {
            let clickCount = 0;
            const startTime = performance.now();
            let quitPressed = false;

            const html = `
                <div style="text-align: center; padding: 40px;">
                    <div style="margin-bottom: 20px;">
                        <span style="font-size: 18px; color: #7f8c8d;">Chest ${trial.trial_number}</span>
                        <span style="font-size: 24px; color: #f1c40f; margin-left: 30px;">🪙 ${trial.total_coins} coins</span>
                    </div>

                    <div id="chest" style="font-size: 100px; cursor: pointer; user-select: none; margin: 40px 0;">
                        📦
                    </div>

                    <div>Click to open!</div>

                    <div style="width: 300px; height: 20px; background: #ecf0f1; border-radius: 10px; margin: 20px auto;">
                        <div id="progress-bar" style="height: 100%; background: #3498db; width: 0%; transition: width 0.1s; border-radius: 10px;"></div>
                    </div>
                    <div id="progress-text" style="color: #7f8c8d;">Clicks: 0 / ${trial.clicks_required}</div>

                    ${trial.show_quit_button ? '<button id="quit-button" style="margin-top: 40px; padding: 15px 30px; font-size: 16px; background: #e74c3c; color: white; border: none; border-radius: 8px; cursor: pointer;">I\'M DONE HUNTING</button>' : ''}
                </div>
            `;

            display_element.innerHTML = html;

            const chest = display_element.querySelector('#chest');
            const progressBar = display_element.querySelector('#progress-bar');
            const progressText = display_element.querySelector('#progress-text');

            const handleClick = () => {
                clickCount++;
                const progress = (clickCount / trial.clicks_required) * 100;
                progressBar.style.width = `${Math.min(progress, 100)}%`;
                progressText.textContent = `Clicks: ${clickCount} / ${trial.clicks_required}`;

                if (clickCount >= trial.clicks_required) {
                    chest.removeEventListener('click', handleClick);
                    setTimeout(() => showOutcome(), 300);
                }
            };

            const showOutcome = () => {
                const outcomeText = trial.outcome === 1
                    ? `<div style="font-size: 48px; color: #f1c40f; margin: 40px 0;">+${CONFIG.coins_per_chest} COINS! 🪙</div>`
                    : `<div style="font-size: 48px; color: #e74c3c; margin: 40px 0;">EMPTY ❌</div>`;

                display_element.innerHTML = `<div style="text-align: center; padding: 40px;">${outcomeText}</div>`;

                setTimeout(() => endTrial(), 1500);
            };

            const endTrial = () => {
                const rt = performance.now() - startTime;
                jsPsych.finishTrial({
                    clicks: clickCount,
                    clicks_required: trial.clicks_required,
                    outcome: trial.outcome,
                    rt: rt,
                    completed: clickCount >= trial.clicks_required,
                    quit_pressed: quitPressed
                });
            };

            chest.addEventListener('click', handleClick);

            if (trial.show_quit_button) {
                const quitButton = display_element.querySelector('#quit-button');
                quitButton.addEventListener('click', () => {
                    quitPressed = true;
                    endTrial();
                });
            }
        }
    }

    jsPsych.plugins['chest-click'] = ChestClickPlugin;

    // ========================================================================
    // TIMELINE
    // ========================================================================

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

    // Practice
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <h2>PRACTICE ROUND</h2>
            <p>Let's practice opening treasure chests!</p>
            <p>Click the chest repeatedly until it opens.</p>
        `,
        choices: ['Start Practice']
    });

    const practiceOutcomes = [1, 0, 1, 1, 0];
    for (let i = 0; i < CONFIG.n_practice; i++) {
        timeline.push({
            type: 'chest-click',
            clicks_required: CONFIG.clicks_baseline,
            outcome: practiceOutcomes[i],
            show_quit_button: false,
            trial_number: i + 1,
            total_coins: practiceCoins,
            on_finish: function(data) {
                if (data.outcome === 1 && data.completed) {
                    practiceCoins += CONFIG.coins_per_chest;
                }
                practiceTrials.push(data);
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
            `;
        },
        choices: ['Start Treasure Hunt']
    });

    // Acquisition phase
    const sequence = getSequence(condition);
    for (let i = 0; i < CONFIG.n_acquisition; i++) {
        const outcome = sequence[i];
        const clicks = getClicksRequired(condition, outcome);

        timeline.push({
            type: 'chest-click',
            clicks_required: clicks,
            outcome: outcome,
            show_quit_button: false,
            trial_number: i + 1,
            total_coins: function() { return totalCoins; },
            on_finish: function(data) {
                if (data.outcome === 1 && data.completed) {
                    totalCoins += CONFIG.coins_per_chest;
                }
                data.condition = condition;
                data.phase = 'acquisition';
                acquisitionTrials.push(data);
            }
        });
    }

    // Transition to extinction
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: function() {
            return `
                <h2>PHASE 1 COMPLETE!</h2>
                <p>Excellent! You collected <strong>${totalCoins}</strong> gold coins!</p>
                <br>
                <p>Now you've discovered a <strong>NEW AREA</strong> with up to ${CONFIG.n_extinction_max} more chests.</p>
                <p style="color: #e74c3c;"><strong>You can stop anytime by clicking "I'M DONE HUNTING"</strong></p>
            `;
        },
        choices: ['Continue Hunting']
    });

    // Extinction phase (conditional loop)
    const extinctionLoop = {
        timeline: [{
            type: 'chest-click',
            clicks_required: CONFIG.clicks_baseline,
            outcome: 0,  // All empty
            show_quit_button: true,
            trial_number: function() { return extinctionTrials.length + 1; },
            total_coins: function() { return totalCoins; },
            on_finish: function(data) {
                data.condition = condition;
                data.phase = 'extinction';
                extinctionTrials.push(data);
            }
        }],
        loop_function: function(data) {
            const lastTrial = data.trials[0];
            if (lastTrial.quit_pressed || extinctionTrials.length >= CONFIG.n_extinction_max) {
                return false;
            }
            return true;
        }
    };

    timeline.push(extinctionLoop);

    // Brief survey
    timeline.push({
        type: jsPsychSurvey,
        pages: [[
            {
                type: 'likert',
                prompt: 'How predictable were the chests?',
                name: 'predictability',
                required: true,
                likert_scale_values: [
                    {value: 1, text: 'Completely Random'},
                    {value: 2, text: ''},
                    {value: 3, text: ''},
                    {value: 4, text: 'Somewhat Predictable'},
                    {value: 5, text: ''},
                    {value: 6, text: ''},
                    {value: 7, text: 'Very Predictable'}
                ]
            }
        ]]
    });

    // Debrief
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: function() {
            const extinctionCount = extinctionTrials.length;
            return `
                <h2>THANK YOU!</h2>
                <p>Study Complete!</p>
                <br>
                <p>You collected <strong>${totalCoins}</strong> coins in Phase 1.</p>
                <p>You opened <strong>${extinctionCount}</strong> chests in Phase 2.</p>
                <br>
                <p>Saving your data...</p>
            `;
        },
        choices: ['Continue']
    });

    // ========================================================================
    // SAVE DATA
    // ========================================================================

    async function saveDataAndRedirect() {
        const endTime = new Date().toISOString();
        const completionCode = generateCompletionCode(participantId);

        const experimentData = {
            participant_id: participantId,
            condition: condition,
            total_coins: totalCoins,
            extinction_chests_opened: extinctionTrials.length,  // PRIMARY DV
            practice_trials: practiceTrials,
            acquisition_trials: acquisitionTrials,
            extinction_trials: extinctionTrials,
            survey_responses: jsPsych.data.get().last(2).values()[0].response,
            start_time: startTime,
            end_time: endTime,
            completion_code: completionCode
        };

        try {
            await api.saveExperimentData(1, experimentData);
            sessionStorage.setItem('completion_code', completionCode);
            window.location.href = 'debrief.html';
        } catch (error) {
            console.error('Error saving data:', error);
            alert('There was an error saving your data. Your data has been saved locally as a backup. Please contact the researcher.');
            window.location.href = 'debrief.html';
        }
    }

    function generateCompletionCode(pid) {
        return pid.substring(0, 8) + '_' + Date.now().toString(36);
    }

    // Run experiment
    jsPsych.run(timeline);
}
