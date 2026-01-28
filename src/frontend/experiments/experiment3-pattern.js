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
        type: jsPsychSurvey,
        pages: [[
            {
                type: 'html',
                prompt: '<h2>Quick Question</h2>'
            },
            {
                type: 'html-slider-response',
                prompt: `
                    <p style="font-size: 18px; margin: 30px auto; max-width: 600px;">
                        Based on the pattern you've observed, <strong>how many ACE cards</strong>
                        do you expect to see in the <strong>next 10 cards</strong>?
                    </p>
                `,
                name: 'expectation_rating',
                required: true,
                min: 0,
                max: 10,
                start: 5,
                step: 1,
                labels: ['0 Aces', '5 Aces', '10 Aces'],
                slider_width: 600
            }
        ]],
        on_finish: function(data) {
            expectationRating = data.response.expectation_rating;
        }
    });

    // PRIMARY DV 2: Betting Question
    timeline.push({
        type: jsPsychSurvey,
        pages: [[
            {
                type: 'html',
                prompt: '<h2>Pattern Prediction</h2>'
            },
            {
                type: 'html-slider-response',
                prompt: `
                    <p style="font-size: 18px; margin: 30px auto; max-width: 600px;">
                        Imagine you just flipped a <strong>BLANK card</strong>.<br><br>
                        What <strong>percentage of $100</strong> would you be willing to bet
                        that the <strong>next card is an ACE</strong>?
                    </p>
                `,
                name: 'pct_bet_ace_after_blank',
                required: true,
                min: 0,
                max: 100,
                start: 50,
                step: 1,
                labels: ['$0 (0%)', '$50 (50%)', '$100 (100%)'],
                slider_width: 600
            }
        ]],
        on_finish: function(data) {
            pctBetAceAfterBlank = data.response.pct_bet_ace_after_blank;
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
        timeline.push({
            type: 'card-flip',
            card_type: 'BLANK',
            trial_number: i + 1,
            total_trials: CONFIG.n_extinction,
            show_feedback: true,
            on_finish: function(data) {
                data.phase = 'extinction';
                data.condition = condition;
                extinctionTrials.push(data);
            }
        });
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
                    { value: 1, text: 'Completely Random' },
                    { value: 2, text: '' },
                    { value: 3, text: '' },
                    { value: 4, text: 'Somewhat Predictable' },
                    { value: 5, text: '' },
                    { value: 6, text: '' },
                    { value: 7, text: 'Very Predictable' }
                ]
            },
            {
                type: 'text',
                prompt: 'Did you notice any pattern in the cards? If so, please describe it:',
                name: 'pattern_description',
                required: false,
                textbox_rows: 3,
                textbox_columns: 50
            }
        ]]
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
                        prompt: 'Enter the digits you saw in order (no spaces):',
                        name: 'digit_recall',
                        required: true,
                        textbox_columns: 20
                    }
                ]],
                on_finish: function(data) {
                    const correctDigits = jsPsych.data.get().last(2).values()[0].current_digits;
                    const userResponse = data.response.digit_recall.trim();
                    const correct = userResponse === correctDigits;

                    data.correct = correct;
                    data.span_length = currentSpan;

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
            <p>Saving your data...</p>
        `,
        choices: ['Continue']
    });

    // ========================================================================
    // SAVE DATA
    // ========================================================================

    async function saveDataAndRedirect() {
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

        try {
            await api.saveExperimentData(3, experimentData);
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
