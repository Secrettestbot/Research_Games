/**
 * ==========================================================================
 * EXPERIMENT 3: PATTERN MEMORY CHALLENGE - jsPsych Implementation
 * ==========================================================================
 */

const CONFIG = {
    n_practice: 4,
    n_acquisition: 20,
    n_extinction: 10,
    card_display_time: 2000,
    feedback_time: 1500,
    digit_span_initial: 3,
    digit_span_max: 9
};

// Generate card sequences based on condition
function getSequence(condition) {
    const sequence = [];

    switch(condition) {
        case 'NR_PATTERN':
        case 'BLANK_FIRST':
            // Alternating: Blank, Ace, Blank, Ace... (Non-Reward Pattern)
            for (let i = 0; i < CONFIG.n_acquisition; i++) {
                sequence.push(i % 2 === 0 ? 'BLANK' : 'ACE');
            }
            break;

        case 'RN_PATTERN':
        case 'ACE_FIRST':
            // Alternating: Ace, Blank, Ace, Blank... (Reward-Nonreward Pattern)
            for (let i = 0; i < CONFIG.n_acquisition; i++) {
                sequence.push(i % 2 === 0 ? 'ACE' : 'BLANK');
            }
            break;

        case 'RANDOM':
        default:
            // Random 50/50 split
            const cards = Array(10).fill('ACE').concat(Array(10).fill('BLANK'));
            for (let i = cards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [cards[i], cards[j]] = [cards[j], cards[i]];
            }
            return cards;
    }

    return sequence;
}

function runPatternMemory(participantId, condition) {
    const jsPsych = initJsPsych({
        display_element: 'jspsych-target',
        on_finish: function() {
            saveDataAndRedirect();
        }
    });

    const startTime = new Date().toISOString();
    const practiceTrials = [];
    const acquisitionTrials = [];
    const extinctionTrials = [];
    let expectationRating = null;
    let pctBetAceAfterBlank = null;
    let digitSpanScore = 0;

    // ========================================================================
    // CUSTOM CARD FLIP PLUGIN
    // ========================================================================

    // Use jsPsychHtmlButtonResponse as a simple replacement for the custom plugin
    // This avoids the ParameterType issue entirely
    function createCardFlipTrial(cardType, trialNumber, totalTrials, showFeedback = true) {
        const cardIcon = cardType === 'ACE' ? '🂡' : '⬜';
        const cardClass = cardType === 'ACE' ? 'card-ace' : 'card-blank';
        const cardLabel = cardType === 'ACE' ? 'ACE' : 'BLANK';

        return {
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <div style="text-align: center; padding: 40px;">
                    <div style="margin-bottom: 20px; color: #7f8c8d;">
                        Card ${trialNumber} of ${totalTrials}
                    </div>
                    <div class="card-display">
                        <div class="${cardClass}">
                            ${cardIcon}
                        </div>
                    </div>
                    ${showFeedback ? `<div style="font-size: 24px; font-weight: bold; margin-top: 20px;">${cardLabel}</div>` : ''}
                </div>
            `,
            choices: ['Continue'],
            data: {
                card_type: cardType,
                trial_number: trialNumber
            }
        };
    }

    // No need for custom plugin registration in jsPsych v7
    // We'll just use the createCardFlipTrial function with jsPsychHtmlButtonResponse

    // ========================================================================
    // TIMELINE
    // ========================================================================

    const timeline = [];

    // Welcome
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <h1>🎴 Pattern Memory Challenge 🎴</h1>
            <p>Welcome to the Pattern Memory Challenge!</p>
            <br>
            <p>In this game, you'll flip playing cards and try to remember the patterns.</p>
            <br>
            <p>The study will take approximately <strong>10 minutes</strong>.</p>
            <br>
            <p>Your task is simple: flip cards and pay attention to what you see!</p>
        `,
        choices: ["Let's Begin"]
    });

    // Instructions
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <h2>How to Play</h2>
            <br>
            <p>You'll see cards face-down on the screen.</p>
            <p><strong>Click each card to flip it over.</strong></p>
            <br>
            <p>Each card will be either:</p>
            <ul style="text-align: left; max-width: 400px; margin: 20px auto; font-size: 18px;">
                <li>🂡 An <strong>ACE</strong> (red card)</li>
                <li>⬜ A <strong>BLANK</strong> (gray card)</li>
            </ul>
            <br>
            <p>Pay close attention to the patterns—you'll be asked about them later!</p>
        `,
        choices: ['Continue']
    });

    // Practice
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <h2>Practice Round</h2>
            <p>Let's practice flipping a few cards first.</p>
        `,
        choices: ['Start Practice']
    });

    const practiceSequence = ['ACE', 'BLANK', 'ACE', 'BLANK'];
    for (let i = 0; i < CONFIG.n_practice; i++) {
        const trial = createCardFlipTrial(practiceSequence[i], i + 1, CONFIG.n_practice, true);
        trial.on_finish = function(data) {
            data.phase = 'practice';
            data.card_type = practiceSequence[i];
            practiceTrials.push(data);
        };
        timeline.push(trial);
    }

    // Transition to main game
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <h2>Practice Complete!</h2>
            <p>Great! Now let's begin the real card flipping challenge.</p>
            <br>
            <p>Remember: <strong>Pay attention to the patterns!</strong></p>
            <p>You'll flip ${CONFIG.n_acquisition} cards in this round.</p>
        `,
        choices: ['Start Card Challenge']
    });

    // Acquisition phase
    const sequence = getSequence(condition);
    for (let i = 0; i < CONFIG.n_acquisition; i++) {
        const trial = createCardFlipTrial(sequence[i], i + 1, CONFIG.n_acquisition, true);
        trial.on_finish = function(data) {
            data.phase = 'acquisition';
            data.condition = condition;
            data.card_type = sequence[i];
            acquisitionTrials.push(data);
        };
        timeline.push(trial);
    }

    // PRIMARY DV 1: Expectation Rating
    timeline.push({
        type: jsPsychHtmlSliderResponse,
        stimulus: `
            <h2>Quick Question</h2>
            <p style="font-size: 18px; margin: 30px auto; max-width: 600px;">
                Based on the pattern you've observed, <strong>how many ACE cards</strong>
                do you expect to see in the <strong>next 10 cards</strong>?
            </p>
            <div id="slider-value" style="font-size: 24px; font-weight: bold; color: #3498db; margin-top: 20px;">
                5 Aces
            </div>
        `,
        labels: ['0 Aces', '5 Aces', '10 Aces'],
        min: 0,
        max: 10,
        slider_start: 5,
        step: 1,
        require_movement: true,
        slider_width: 600,
        on_load: function() {
            const slider = document.querySelector('input[type="range"]');
            const valueDisplay = document.querySelector('#slider-value');
            slider.addEventListener('input', function() {
                const val = this.value;
                valueDisplay.textContent = val + (val == 1 ? ' Ace' : ' Aces');
            });
        },
        on_finish: function(data) {
            expectationRating = data.response;
        }
    });

    // PRIMARY DV 2: Betting Question
    timeline.push({
        type: jsPsychHtmlSliderResponse,
        stimulus: `
            <h2>Pattern Prediction</h2>
            <p style="font-size: 18px; margin: 30px auto; max-width: 600px;">
                Imagine you just flipped a <strong>BLANK card</strong>.<br><br>
                What <strong>percentage of $100</strong> would you be willing to bet
                that the <strong>next card is an ACE</strong>?
            </p>
            <div id="slider-value-pct" style="font-size: 24px; font-weight: bold; color: #3498db; margin-top: 20px;">
                $50 (50%)
            </div>
        `,
        labels: ['$0 (0%)', '$50 (50%)', '$100 (100%)'],
        min: 0,
        max: 100,
        slider_start: 50,
        step: 1,
        require_movement: true,
        slider_width: 600,
        on_load: function() {
            const slider = document.querySelector('input[type="range"]');
            const valueDisplay = document.querySelector('#slider-value-pct');
            slider.addEventListener('input', function() {
                const val = this.value;
                valueDisplay.textContent = '$' + val + ' (' + val + '%)';
            });
        },
        on_finish: function(data) {
            pctBetAceAfterBlank = data.response;
        }
    });

    // Transition to extinction
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <h2>Final Round</h2>
            <p>Great! Now let's flip ${CONFIG.n_extinction} more cards.</p>
            <p>Continue paying attention to the patterns!</p>
        `,
        choices: ['Continue']
    });

    // Extinction phase (all BLANK cards)
    for (let i = 0; i < CONFIG.n_extinction; i++) {
        const trial = createCardFlipTrial('BLANK', i + 1, CONFIG.n_extinction, true);
        trial.on_finish = function(data) {
            data.phase = 'extinction';
            data.condition = condition;
            data.card_type = 'BLANK';
            extinctionTrials.push(data);
        };
        timeline.push(trial);
    }

    // Manipulation check
    timeline.push({
        type: jsPsychSurvey,
        pages: [[
            {
                type: 'likert',
                prompt: 'How predictable were the card patterns?',
                name: 'predictability',
                required: true,
                likert_scale_values: [
                    { value: 1, text: '1 - Random' },
                    { value: 2, text: '2' },
                    { value: 3, text: '3' },
                    { value: 4, text: '4' },
                    { value: 5, text: '5' },
                    { value: 6, text: '6' },
                    { value: 7, text: '7' },
                    { value: 8, text: '8' },
                    { value: 9, text: '9' },
                    { value: 10, text: '10 - Always Predictable' }
                ]
            },
            {
                type: 'text',
                prompt: 'Did you notice any pattern in the cards? If so, please describe it:',
                name: 'pattern_description',
                required: false,
                textbox_rows: 4,
                textbox_columns: 60,
                placeholder: 'Optional: Describe any pattern you observed...'
            }
        ]],
        on_load: function() {
            // Force radio buttons to be visible and LARGE with JavaScript
            setTimeout(() => {
                const radioButtons = document.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => {
                    radio.style.appearance = 'auto';
                    radio.style.webkitAppearance = 'radio';
                    radio.style.mozAppearance = 'radio';
                    radio.style.width = '15px';
                    radio.style.height = '15px';
                    radio.style.margin = '50px';
                    radio.style.cursor = 'pointer';
                    radio.style.display = 'inline-block';
                    radio.style.opacity = '1';
                    radio.style.visibility = 'visible';
                    radio.style.position = 'relative';
                    radio.style.zIndex = '1000';
                    radio.style.transform = 'scale(1.5)';
                    radio.style.border = '3px solid #333';
                });

                // Make labels more visible too
                const labels = document.querySelectorAll('.jspsych-survey-likert label');
                labels.forEach(label => {
                    label.style.display = 'flex';
                    label.style.flexDirection = 'column';
                    label.style.alignItems = 'center';
                    label.style.padding = '20px';
                    label.style.cursor = 'pointer';
                });
            }, 100);
        }
    });

    // Working Memory Test - Digit Span
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <h2>Memory Test</h2>
            <p>Finally, we'll test your working memory with a brief task.</p>
            <br>
            <p>You'll see numbers appear one at a time.</p>
            <p>Try to remember them in order, then type them back.</p>
        `,
        choices: ['Start Memory Test']
    });

    let currentSpan = CONFIG.digit_span_initial;
    let consecutiveCorrect = 0;
    let consecutiveIncorrect = 0;
    let maxSpanAchieved = 0;

    const digitSpanLoop = {
        timeline: [
            {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: function() {
                    const digits = [];
                    for (let i = 0; i < currentSpan; i++) {
                        digits.push(Math.floor(Math.random() * 10));
                    }
                    jsPsych.data.addProperties({ current_digits: digits.join('') });
                    return '<div style="font-size: 72px; font-weight: bold;">+</div>';
                },
                choices: "NO_KEYS",
                trial_duration: 500
            },
            {
                timeline: [{
                    type: jsPsychHtmlKeyboardResponse,
                    stimulus: function() {
                        const allDigits = jsPsych.data.get().last(1).values()[0].current_digits;
                        const digitIndex = jsPsych.timelineVariable('digit_index');
                        return `<div style="font-size: 96px; font-weight: bold;">${allDigits[digitIndex]}</div>`;
                    },
                    choices: "NO_KEYS",
                    trial_duration: 1000,
                    post_trial_gap: 250
                }],
                timeline_variables: function() {
                    const vars = [];
                    for (let i = 0; i < currentSpan; i++) {
                        vars.push({ digit_index: i });
                    }
                    return vars;
                }
            },
            {
                type: jsPsychSurvey,
                pages: [[
                    {
                        type: 'text',
                        prompt: '<p style="font-size: 18px; margin-bottom: 20px;">Enter the digits you saw in order (no spaces):</p>',
                        name: 'digit_recall',
                        required: false,
                        textbox_columns: 30,
                        placeholder: 'e.g., 12345'
                    }
                ]],
                button_label_finish: 'Submit',
                validation: function(data) {
                    // Custom validation - allow empty or any input
                    return undefined;
                },
                on_finish: function(data) {
                    const correctDigits = jsPsych.data.get().last(2).values()[0].current_digits;
                    const userResponse = data.response.digit_recall ? String(data.response.digit_recall).trim() : '';

                    console.log('User entered:', userResponse);
                    console.log('Correct answer:', correctDigits);

                    // If empty, count as incorrect
                    const correct = userResponse.length > 0 && userResponse === correctDigits;

                    data.correct = correct;
                    data.span_length = currentSpan;
                    data.user_response = userResponse;
                    data.correct_answer = correctDigits;

                    if (correct) {
                        consecutiveCorrect++;
                        consecutiveIncorrect = 0;
                        maxSpanAchieved = Math.max(maxSpanAchieved, currentSpan);
                        if (consecutiveCorrect >= 2 && currentSpan < CONFIG.digit_span_max) {
                            currentSpan++;
                            consecutiveCorrect = 0;
                        }
                    } else {
                        consecutiveIncorrect++;
                        consecutiveCorrect = 0;
                    }
                }
            }
        ],
        loop_function: function() {
            if (consecutiveIncorrect >= 2 || currentSpan > CONFIG.digit_span_max) {
                digitSpanScore = maxSpanAchieved;
                return false;
            }
            return true;
        }
    };

    timeline.push(digitSpanLoop);

    // Debrief
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <h2>THANK YOU!</h2>
            <p>You have completed the Pattern Memory Challenge!</p>
            <br>
            <p>Click Continue to save your data and finish the study.</p>
        `,
        choices: ['Continue'],
        on_finish: async function() {
            console.log('Final button clicked, calling saveDataAndRedirect directly');

            // Show loading spinner
            document.querySelector('#jspsych-target').innerHTML = `
                <div style="text-align: center; padding: 60px;">
                    <h2>Saving your data...</h2>
                    <p>Please wait, do not close this window.</p>
                    <div style="margin-top: 30px;">
                        <div style="display: inline-block; width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    </div>
                    <style>
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                </div>
            `;

            // Call save function directly instead of waiting for jsPsych on_finish
            await saveDataAndRedirect();
        }
    });

    // ========================================================================
    // SAVE DATA
    // ========================================================================

    async function saveDataAndRedirect() {
        console.log('saveDataAndRedirect called');
        const endTime = new Date().toISOString();
        const completionCode = generateCompletionCode(participantId);

        // Get manipulation check data
        const allData = jsPsych.data.get().values();
        const manipCheckData = allData.find(d => d.response && d.response.predictability);
        const digitSpanTrials = allData.filter(d => d.span_length !== undefined);

        const experimentData = {
            participant_id: participantId,
            condition: condition,

            // PRIMARY DVs
            expectation_rating: expectationRating,
            pct_bet_ace_after_blank: pctBetAceAfterBlank,

            // Trial data
            practice_trials: practiceTrials,
            acquisition_trials: acquisitionTrials,
            extinction_trials: extinctionTrials,

            // Manipulation check
            manipulation_check: manipCheckData ? manipCheckData.response : {},

            // Working memory
            digit_span_score: digitSpanScore,
            digit_span_trials: digitSpanTrials,

            // Metadata
            start_time: startTime,
            end_time: endTime,
            completion_code: completionCode
        };

        console.log('Attempting to save data:', experimentData);

        try {
            const result = await api.saveExperimentData(3, experimentData);
            console.log('Data saved successfully:', result);
            sessionStorage.setItem('completion_code', completionCode);

            // Give user feedback before redirecting
            setTimeout(() => {
                window.location.href = 'debrief.html';
            }, 500);
        } catch (error) {
            console.error('Error saving data:', error);

            // Display error with more details
            document.querySelector('#jspsych-target').innerHTML = `
                <div style="text-align: center; padding: 60px;">
                    <h2 style="color: #e74c3c;">Error Saving Data</h2>
                    <p>There was an error saving your data: ${error.message}</p>
                    <p>Your data has been saved locally as a backup.</p>
                    <p>Please take a screenshot of this page and contact the researcher.</p>
                    <br>
                    <button onclick="window.location.href='debrief.html'"
                            style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
                        Continue to Debrief
                    </button>
                </div>
            `;

            // Still set completion code even if save fails
            sessionStorage.setItem('completion_code', completionCode);
        }
    }

    function generateCompletionCode(pid) {
        return pid.substring(0, 8) + '_' + Date.now().toString(36);
    }

    // Run experiment
    jsPsych.run(timeline);
}
