/**
 * ==========================================================================
 * EXPERIMENT 2: CAREER CHOICE STUDY - jsPsych Implementation
 * ==========================================================================
 */

const CONFIG = {
    digit_span_initial: 3,
    digit_span_max: 9,
    digit_display_time: 1000,
    digit_isi: 250
};

// Company scenarios (within-subjects - all participants see all 3)
const SCENARIOS = {
    CONSISTENT: {
        id: 'A',
        name: 'Company A',
        description: 'Tech startup in Silicon Valley',
        history: [
            { month: 1, paid: true },
            { month: 2, paid: true },
            { month: 3, paid: true },
            { month: 4, paid: true },
            { month: 5, paid: true },
            { month: 6, paid: true }
        ],
        pattern_type: 'consistent'
    },
    EARNED: {
        id: 'B',
        name: 'Company B',
        description: 'Marketing agency in New York',
        history: [
            { month: 1, paid: false },
            { month: 2, paid: true },
            { month: 3, paid: false },
            { month: 4, paid: true },
            { month: 5, paid: false },
            { month: 6, paid: true }
        ],
        pattern_type: 'earned'
    },
    PATTERNED: {
        id: 'C',
        name: 'Company C',
        description: 'Design consultancy in Austin',
        history: [
            { month: 1, paid: false },
            { month: 2, paid: true },
            { month: 3, paid: false },
            { month: 4, paid: true },
            { month: 5, paid: false },
            { month: 6, paid: true }
        ],
        pattern_type: 'patterned'
    }
};

function runCareerChoice(participantId) {
    const jsPsych = initJsPsych({
        display_element: 'jspsych-target',
        on_finish: function() {
            saveDataAndRedirect();
        }
    });

    const startTime = new Date().toISOString();
    const scenarioOrder = jsPsych.randomization.shuffle(['CONSISTENT', 'EARNED', 'PATTERNED']);
    const responses = {
        tenure: {},
        value: {},
        manipulation_checks: {},
        digit_span_score: 0
    };

    // ========================================================================
    // TIMELINE
    // ========================================================================

    const timeline = [];

    // Welcome
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <h1>Career Choice Study</h1>
            <p>Welcome! Thank you for participating in this research study.</p>
            <br>
            <p>In this study, you'll be presented with information about different companies
            and asked to make judgments about career decisions.</p>
            <br>
            <p>The study will take approximately <strong>12 minutes</strong> to complete.</p>
            <br>
            <p><strong>Please read all instructions carefully and answer honestly.</strong></p>
        `,
        choices: ["Let's Begin"]
    });

    // Instructions
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <h2>Instructions</h2>
            <p>Imagine you are a recent college graduate exploring job opportunities.</p>
            <br>
            <p>You will read about <strong>three different companies</strong> and their payment histories.</p>
            <br>
            <p>For each company, you'll see:</p>
            <ul style="text-align: left; max-width: 500px; margin: 20px auto;">
                <li>A 6-month payment history (whether they paid employees on time each month)</li>
                <li>Questions about how long you would stay and how you value the company</li>
            </ul>
            <br>
            <p><strong>There are no right or wrong answers.</strong> We're interested in your genuine opinions.</p>
        `,
        choices: ['Continue']
    });

    // Create scenario trials
    for (let i = 0; i < scenarioOrder.length; i++) {
        const scenarioKey = scenarioOrder[i];
        const scenario = SCENARIOS[scenarioKey];

        // Scenario introduction
        timeline.push({
            type: jsPsychHtmlButtonResponse,
            stimulus: function() {
                return `
                    <h2>${scenario.name}</h2>
                    <p style="font-size: 18px; color: #495057;">${scenario.description}</p>
                    <br>
                    <p>Imagine you've been working at ${scenario.name} for 6 months.</p>
                    <p>Let's review their payment history during your time there...</p>
                `;
            },
            choices: ['View Payment History']
        });

        // Payment history display
        timeline.push({
            type: jsPsychHtmlButtonResponse,
            stimulus: function() {
                let historyHTML = `
                    <h2>${scenario.name} - Payment History</h2>
                    <p>Here's whether ${scenario.name} paid you on time each month:</p>
                    <br>
                    <div style="max-width: 500px; margin: 30px auto; text-align: left;">
                `;

                scenario.history.forEach(record => {
                    const icon = record.paid ? '✓' : '✗';
                    const color = record.paid ? '#28a745' : '#dc3545';
                    const status = record.paid ? 'PAID ON TIME' : 'PAYMENT DELAYED';

                    historyHTML += `
                        <div style="display: flex; justify-content: space-between; align-items: center;
                                    padding: 15px; margin: 10px 0; background: #f8f9fa;
                                    border-left: 4px solid ${color}; border-radius: 4px;">
                            <span style="font-weight: bold;">Month ${record.month}</span>
                            <span style="color: ${color}; font-weight: bold;">
                                ${icon} ${status}
                            </span>
                        </div>
                    `;
                });

                historyHTML += `</div><br><p>Now, please answer some questions about ${scenario.name}...</p>`;
                return historyHTML;
            },
            choices: ['Continue to Questions']
        });

        // Primary DV questions using Survey plugin
        timeline.push({
            type: jsPsychSurvey,
            pages: [[
                {
                    type: 'html',
                    prompt: `<h3>${scenario.name} - Your Decisions</h3>`
                },
                {
                    type: 'html-slider-response',
                    prompt: `<p style="font-size: 16px; margin: 20px 0;">
                        <strong>If payment issues continue, how many MORE months would you stay at ${scenario.name}?</strong>
                    </p>`,
                    name: `tenure_${scenario.id}`,
                    required: true,
                    min: 0,
                    max: 24,
                    start: 12,
                    step: 1,
                    labels: ['0 months<br>(Leave immediately)', '12 months', '24 months<br>(Stay 2 more years)'],
                    slider_width: 600
                },
                {
                    type: 'html-slider-response',
                    prompt: `<p style="font-size: 16px; margin: 20px 0;">
                        <strong>How much do you value working at ${scenario.name}?</strong>
                    </p>`,
                    name: `value_${scenario.id}`,
                    required: true,
                    min: 0,
                    max: 100,
                    start: 50,
                    step: 1,
                    labels: ['0<br>Not at all valuable', '50<br>Moderately valuable', '100<br>Extremely valuable'],
                    slider_width: 600
                },
                {
                    type: 'likert',
                    prompt: `How predictable were ${scenario.name}'s payments?`,
                    name: `predictability_${scenario.id}`,
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
                    type: 'likert',
                    prompt: `How much effort did it take to work for ${scenario.name} during the inconsistent payment period?`,
                    name: `effort_${scenario.id}`,
                    required: true,
                    likert_scale_values: [
                        { value: 1, text: 'No effort at all' },
                        { value: 2, text: '' },
                        { value: 3, text: '' },
                        { value: 4, text: 'Moderate effort' },
                        { value: 5, text: '' },
                        { value: 6, text: '' },
                        { value: 7, text: 'Extreme effort' }
                    ]
                }
            ]],
            on_finish: function(data) {
                const response = data.response;
                responses.tenure[scenario.id] = response[`tenure_${scenario.id}`];
                responses.value[scenario.id] = response[`value_${scenario.id}`];
                responses.manipulation_checks[scenario.id] = {
                    predictability: response[`predictability_${scenario.id}`],
                    effort: response[`effort_${scenario.id}`]
                };
            }
        });

        // Brief pause between scenarios
        if (i < scenarioOrder.length - 1) {
            timeline.push({
                type: jsPsychHtmlButtonResponse,
                stimulus: `
                    <h2>Great Job!</h2>
                    <p>You've completed the questions for ${scenario.name}.</p>
                    <br>
                    <p>Let's move on to the next company...</p>
                `,
                choices: ['Continue']
            });
        }
    }

    // Working Memory Test - Digit Span
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <h2>Memory Test</h2>
            <p>Now we'll test your working memory with a brief digit span task.</p>
            <br>
            <p>You'll see a sequence of numbers appear one at a time.</p>
            <p>Try to remember them in order.</p>
            <p>After the sequence, type the numbers you saw.</p>
            <br>
            <p>We'll start with a short sequence and it may get longer.</p>
        `,
        choices: ['Start Memory Test']
    });

    // Digit span trials
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
                    trial_duration: CONFIG.digit_display_time,
                    post_trial_gap: CONFIG.digit_isi
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
            // Stop if 2 consecutive errors or reached max span
            if (consecutiveIncorrect >= 2 || currentSpan > CONFIG.digit_span_max) {
                responses.digit_span_score = maxSpanAchieved;
                return false;
            }
            return true;
        }
    };

    timeline.push(digitSpanLoop);

    // Demographics
    timeline.push({
        type: jsPsychSurvey,
        pages: [[
            {
                type: 'html',
                prompt: '<h2>Background Information</h2><p>Finally, a few questions about yourself:</p>'
            },
            {
                type: 'multi-choice',
                prompt: 'What is your age range?',
                name: 'age',
                options: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
                required: true
            },
            {
                type: 'multi-choice',
                prompt: 'What is your gender?',
                name: 'gender',
                options: ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Prefer to self-describe'],
                required: false
            },
            {
                type: 'multi-choice',
                prompt: 'What is your highest level of education?',
                name: 'education',
                options: [
                    'High school or equivalent',
                    'Some college',
                    'Associate degree',
                    'Bachelor\'s degree',
                    'Master\'s degree',
                    'Doctoral degree',
                    'Professional degree (MD, JD, etc.)'
                ],
                required: false
            },
            {
                type: 'multi-choice',
                prompt: 'Have you ever experienced delayed or missed paychecks from an employer?',
                name: 'payment_experience',
                options: ['Yes', 'No', 'Prefer not to say'],
                required: false
            }
        ]]
    });

    // Debrief
    timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <h2>THANK YOU!</h2>
            <p>You have completed the Career Choice Study.</p>
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

        // Get demographics and digit span data
        const allData = jsPsych.data.get().values();
        const demographicsData = allData.find(d => d.response && d.response.age);
        const digitSpanTrials = allData.filter(d => d.span_length !== undefined);

        const experimentData = {
            participant_id: participantId,
            scenario_order: scenarioOrder,

            // PRIMARY DVs
            tenure_A: responses.tenure.A,
            tenure_B: responses.tenure.B,
            tenure_C: responses.tenure.C,
            value_A: responses.value.A,
            value_B: responses.value.B,
            value_C: responses.value.C,

            // Manipulation checks
            manipulation_checks: responses.manipulation_checks,

            // Working memory
            digit_span_score: responses.digit_span_score,
            digit_span_trials: digitSpanTrials,

            // Demographics
            demographics: demographicsData ? demographicsData.response : {},

            // Metadata
            start_time: startTime,
            end_time: endTime,
            completion_code: completionCode
        };

        try {
            await api.saveExperimentData(2, experimentData);
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
