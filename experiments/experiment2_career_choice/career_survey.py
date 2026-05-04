#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
================================================================================
EXPERIMENT 2: THE CAREER CHOICE STUDY
================================================================================

Description:
    A within-subjects survey comparing job offers with different recognition
    programs to test Festinger's Cognitive Dissonance Theory vs. Capaldi's
    Sequential Theory in a realistic workplace scenario.

    Participants evaluate three hypothetical startup companies that differ ONLY
    in their employee recognition patterns, then answer questions about their
    preferences and the mechanisms behind them.

Theoretical Background:
    - FESTINGER (1957): Effort justification - Working for recognition makes
      it more valuable, leading to longer tenure intentions after it ends.
      Prediction: EARNED (requires work) > CONSISTENT = PATTERNED

    - CAPALDI (1967): Sequential association - Patterned recognition (quiet
      month → spotlight) creates expectations that persist.
      Prediction: PATTERNED (N→R pattern) > CONSISTENT > EARNED

Design:
    Within-Subjects (all participants see all 3 scenarios)
    - Company A: CONSISTENT (spotlight every month)
    - Company B: EARNED (4 hours work to earn monthly spotlight)
    - Company C: PATTERNED (alternating: quiet month → spotlight)

    All conditions: 12 spotlights per year (matched frequency)
    Presentation order: Randomized

Primary DVs:
    1. Tenure intention (months before leaving after program ends)
    2. Recognition value rating (0-100)
    3. Salary equivalent ($0-$20,000)
    4. Attractiveness rating (1-7)

Platform Options:
    - Qualtrics (recommended for ease of use)
    - PsychoPy/Pavlovia
    - Custom web implementation

Sample: 240 students (after exclusions)
Time: ~12 minutes

Author: Research Games Project
Date: January 2025
Reference: Festinger (1957), Capaldi (1967)
================================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import random
import json
import os

# =============================================================================
# CONFIGURATION
# =============================================================================

@dataclass
class ExperimentConfig:
    """Configuration settings for Experiment 2."""

    # Experiment metadata
    experiment_name: str = "CareerChoiceSurvey"
    version: str = "1.0.0"

    # Timing
    estimated_duration_minutes: int = 12
    min_valid_duration_minutes: int = 5
    max_valid_duration_minutes: int = 30

    # Scenario parameters (matched across conditions)
    base_salary: int = 70000
    spotlights_per_year: int = 12
    hours_work_earned: int = 4  # Hours required for EARNED condition

    # DV ranges
    tenure_max_months: int = 24
    value_scale_max: int = 100
    salary_equivalent_options: List[int] = field(default_factory=lambda: [
        0, 2500, 5000, 7500, 10000, 12500, 15000, 20000
    ])
    likert_scale: Tuple[int, int] = (1, 7)

    # Attention check correct answers
    correct_spotlights: int = 12  # All companies give 12 spotlights
    correct_work_company: str = "B"  # Company B requires work
    correct_pattern: str = "alternating"  # Company C alternates


# =============================================================================
# SCENARIO DEFINITIONS
# =============================================================================

@dataclass
class CompanyScenario:
    """
    Represents a company scenario in the experiment.

    Each scenario describes a startup with identical characteristics except
    for the recognition program structure.
    """

    id: str                     # A, B, or C
    name: str                   # Company name
    recognition_type: str       # CONSISTENT, EARNED, or PATTERNED
    description: str            # Full scenario text
    recognition_description: str  # Description of recognition program
    pattern_visual: str         # Visual representation of pattern
    work_required: bool         # Whether extra work is needed
    work_hours: int             # Hours of work per recognition (0 if not required)


# Company A: CONSISTENT Recognition
COMPANY_A = CompanyScenario(
    id="A",
    name="TechFlow",
    recognition_type="CONSISTENT",
    work_required=False,
    work_hours=0,
    recognition_description="""RECOGNITION PROGRAM: "Monthly Spotlight"
- Given EVERY MONTH (12 times per year)
- You receive a spotlight at the monthly all-hands meeting
- Your work is highlighted to the whole company
- No extra work required - given to everyone each month""",
    pattern_visual="""PATTERN:
Month 1: ⭐ Spotlight
Month 2: ⭐ Spotlight
Month 3: ⭐ Spotlight
Month 4: ⭐ Spotlight
...continues every month...""",
    description="""
═══════════════════════════════════════════════════════════════════════════════
COMPANY A: TechFlow
═══════════════════════════════════════════════════════════════════════════════

SALARY: $70,000/year

RECOGNITION PROGRAM: "Monthly Spotlight"
- Given EVERY MONTH (12 times per year)
- You receive a spotlight at the monthly all-hands meeting
- Your work is highlighted to the whole company
- No extra work required

PATTERN:
Month 1: ⭐ Spotlight
Month 2: ⭐ Spotlight
Month 3: ⭐ Spotlight
Month 4: ⭐ Spotlight
...continues every month...

After 1 year, the recognition program is discontinued (budget cuts).
Everything else about the job stays the same.
═══════════════════════════════════════════════════════════════════════════════
"""
)


# Company B: EARNED Recognition (Festinger's effort manipulation)
COMPANY_B = CompanyScenario(
    id="B",
    name="InnovateX",
    recognition_type="EARNED",
    work_required=True,
    work_hours=4,
    recognition_description="""RECOGNITION PROGRAM: "Spotlight Award"
- Given EVERY MONTH (12 times per year)
- To earn each spotlight, you must complete a "Sprint Portfolio":
  → Write summary of your work
  → Present to your team
  → Get 2 peer reviews
- Takes about 4 hours of work per spotlight
- You consistently earn the spotlight (you put in the work!)""",
    pattern_visual="""PATTERN:
Month 1: [4 hours work] → ⭐ Spotlight earned
Month 2: [4 hours work] → ⭐ Spotlight earned
Month 3: [4 hours work] → ⭐ Spotlight earned
...continues every month...""",
    description="""
═══════════════════════════════════════════════════════════════════════════════
COMPANY B: InnovateX
═══════════════════════════════════════════════════════════════════════════════

SALARY: $70,000/year

RECOGNITION PROGRAM: "Spotlight Award"
- Given EVERY MONTH (12 times per year)
- To earn each spotlight, you must complete a "Sprint Portfolio":
  → Write summary of your work
  → Present to your team
  → Get 2 peer reviews
- Takes about 4 hours of work per spotlight
- You consistently earn the spotlight (you put in the work!)

PATTERN:
Month 1: [4 hours work] → ⭐ Spotlight earned
Month 2: [4 hours work] → ⭐ Spotlight earned
Month 3: [4 hours work] → ⭐ Spotlight earned
...continues every month...

After 1 year, the recognition program is discontinued (budget cuts).
Everything else about the job stays the same.
═══════════════════════════════════════════════════════════════════════════════

THEORETICAL NOTE (Festinger, 1957):
This condition tests effort justification. Participants must work 4 hours/month
for recognition. According to cognitive dissonance theory, this effort should
increase perceived value: "I worked hard, so it must be valuable."

PREDICTION: If Festinger is correct, EARNED > CONSISTENT and EARNED > PATTERNED
"""
)


# Company C: PATTERNED Recognition (Capaldi's N→R sequence)
COMPANY_C = CompanyScenario(
    id="C",
    name="BuildCorp",
    recognition_type="PATTERNED",
    work_required=False,
    work_hours=0,
    recognition_description="""RECOGNITION PROGRAM: "Spotlight Award"
- Given 12 times per year (same total as other companies)
- No extra work required (given to everyone on schedule)
- Spotlights follow a specific ALTERNATING pattern:
  After a QUIET month, you always get a SPOTLIGHT
  After a SPOTLIGHT, you always get a QUIET month""",
    pattern_visual="""PATTERN:
Month 1: — (no spotlight)
Month 2: ⭐ Spotlight
Month 3: — (no spotlight)
Month 4: ⭐ Spotlight
Month 5: — (no spotlight)
Month 6: ⭐ Spotlight
...continues alternating...""",
    description="""
═══════════════════════════════════════════════════════════════════════════════
COMPANY C: BuildCorp
═══════════════════════════════════════════════════════════════════════════════

SALARY: $70,000/year

RECOGNITION PROGRAM: "Spotlight Award"
- Given 12 times per year (same as A and B)
- No extra work required (given to everyone on schedule)

PATTERN:
The spotlights follow a specific pattern—they come in an alternating schedule,
with quiet months in between:

Month 1: — (no spotlight)
Month 2: ⭐ Spotlight
Month 3: — (no spotlight)
Month 4: ⭐ Spotlight
Month 5: — (no spotlight)
Month 6: ⭐ Spotlight
...continues alternating...

So: After a QUIET MONTH, you always get a SPOTLIGHT.
After a SPOTLIGHT, you always get a QUIET MONTH.

After 1 year, the recognition program is discontinued (budget cuts).
Everything else about the job stays the same.
═══════════════════════════════════════════════════════════════════════════════

THEORETICAL NOTE (Capaldi, 1967):
This condition tests sequential learning. The N→R pattern (quiet → spotlight)
creates a learned expectation: "After nothing, something comes."

This expectation should persist even after the program ends, leading to higher
tenure intentions as participants expect the pattern might resume.

PREDICTION: If Capaldi is correct, PATTERNED > CONSISTENT > EARNED
"""
)

# All scenarios for easy access
ALL_SCENARIOS = [COMPANY_A, COMPANY_B, COMPANY_C]


# =============================================================================
# SURVEY QUESTIONS
# =============================================================================

@dataclass
class SurveyQuestion:
    """Represents a survey question."""

    id: str
    text: str
    question_type: str  # likert, slider, choice, text, ranking
    options: Optional[List] = None
    scale_min: Optional[int] = None
    scale_max: Optional[int] = None
    scale_labels: Optional[Tuple[str, str]] = None
    required: bool = True


# Questions asked AFTER EACH SCENARIO
SCENARIO_QUESTIONS = [
    SurveyQuestion(
        id="attractiveness",
        text="How attractive is this job offer overall?",
        question_type="likert",
        scale_min=1,
        scale_max=7,
        scale_labels=("Not at all attractive", "Extremely attractive")
    ),
    SurveyQuestion(
        id="value",
        text="How valuable is this recognition program to you?",
        question_type="slider",
        scale_min=0,
        scale_max=100,
        scale_labels=("Not at all valuable", "Extremely valuable")
    ),
    SurveyQuestion(
        id="tenure",
        text="""After the recognition program ends, how many MORE months would you
likely stay at this company before looking for other jobs?""",
        question_type="slider",
        scale_min=0,
        scale_max=24,
        scale_labels=("0 months", "24+ months")
    ),
    SurveyQuestion(
        id="salary_equivalent",
        text="""How much EXTRA salary would you need (per year) to give up this
recognition program?""",
        question_type="choice",
        options=[0, 2500, 5000, 7500, 10000, 12500, 15000, 20000]
    ),
]

# Condition-specific questions (effort/predictability perception)
CONDITION_SPECIFIC_QUESTIONS = {
    "A": [  # CONSISTENT
        SurveyQuestion(
            id="predictability_A",
            text="How predictable was the recognition?",
            question_type="likert",
            scale_min=1,
            scale_max=7,
            scale_labels=("Completely unpredictable", "Completely predictable")
        ),
    ],
    "B": [  # EARNED
        SurveyQuestion(
            id="work_required_B",
            text="How much work did this recognition require?",
            question_type="likert",
            scale_min=1,
            scale_max=7,
            scale_labels=("No work", "A lot of work")
        ),
    ],
    "C": [  # PATTERNED
        SurveyQuestion(
            id="predictability_C",
            text="How predictable was the recognition pattern?",
            question_type="likert",
            scale_min=1,
            scale_max=7,
            scale_labels=("Completely unpredictable", "Completely predictable")
        ),
    ],
}


# COMPARATIVE QUESTIONS (after all scenarios)
COMPARATIVE_QUESTIONS = [
    SurveyQuestion(
        id="ranking",
        text="RANK THE COMPANIES from most to least attractive overall:",
        question_type="ranking",
        options=["Company A (TechFlow)", "Company B (InnovateX)", "Company C (BuildCorp)"]
    ),
    SurveyQuestion(
        id="forced_choice",
        text="If you HAD to choose one job right now, which would you pick?",
        question_type="choice",
        options=["Company A (TechFlow)", "Company B (InnovateX)", "Company C (BuildCorp)"]
    ),
]


# MANIPULATION CHECKS
MANIPULATION_CHECKS = [
    SurveyQuestion(
        id="check_spotlights_A",
        text="How many total spotlights did Company A give per year?",
        question_type="text",  # Free response, must equal 12
    ),
    SurveyQuestion(
        id="check_spotlights_B",
        text="How many total spotlights did Company B give per year?",
        question_type="text",
    ),
    SurveyQuestion(
        id="check_spotlights_C",
        text="How many total spotlights did Company C give per year?",
        question_type="text",
    ),
    SurveyQuestion(
        id="check_work",
        text="Which company required extra WORK to earn the recognition?",
        question_type="choice",
        options=["Company A", "Company B", "Company C", "None of them"]
    ),
    SurveyQuestion(
        id="check_pattern",
        text="Company C's spotlights followed this pattern:",
        question_type="choice",
        options=[
            "Random (no pattern)",
            "Every month (predictable)",
            "Alternating: Quiet month, then spotlight",
            "I don't remember"
        ]
    ),
]


# MECHANISM QUESTIONS (testing Festinger vs Capaldi)
MECHANISM_QUESTIONS = [
    # Festinger (Effort → Value)
    SurveyQuestion(
        id="effort_value",
        text='"I would value Company B\'s recognition MORE because I had to work for it"',
        question_type="likert",
        scale_min=1,
        scale_max=7,
        scale_labels=("Strongly Disagree", "Strongly Agree")
    ),
    SurveyQuestion(
        id="effort_meaning",
        text='"Recognition that requires effort is more meaningful than recognition that\'s automatically given"',
        question_type="likert",
        scale_min=1,
        scale_max=7,
        scale_labels=("Strongly Disagree", "Strongly Agree")
    ),
    SurveyQuestion(
        id="effort_tenure",
        text='"After Company B\'s recognition ended, I\'d stay longer because the recognition meant so much to me"',
        question_type="likert",
        scale_min=1,
        scale_max=7,
        scale_labels=("Strongly Disagree", "Strongly Agree")
    ),

    # Capaldi (Pattern → Expectation)
    SurveyQuestion(
        id="pattern_expect",
        text='"At Company C, after a QUIET MONTH, I would EXPECT a spotlight next"',
        question_type="likert",
        scale_min=1,
        scale_max=7,
        scale_labels=("Strongly Disagree", "Strongly Agree")
    ),
    SurveyQuestion(
        id="pattern_value",
        text='"I\'d value Company C\'s recognition more because I could predict when it would come"',
        question_type="likert",
        scale_min=1,
        scale_max=7,
        scale_labels=("Strongly Disagree", "Strongly Agree")
    ),
    SurveyQuestion(
        id="pattern_persist",
        text='"After Company C\'s recognition ended, I\'d keep expecting the pattern to continue"',
        question_type="likert",
        scale_min=1,
        scale_max=7,
        scale_labels=("Strongly Disagree", "Strongly Agree")
    ),
]


# INDIVIDUAL DIFFERENCES
INDIVIDUAL_DIFFERENCE_QUESTIONS = [
    # Need for Structure
    SurveyQuestion(
        id="nfs_1",
        text='"I prefer things to be predictable and consistent"',
        question_type="likert",
        scale_min=1,
        scale_max=7,
        scale_labels=("Strongly Disagree", "Strongly Agree")
    ),
    SurveyQuestion(
        id="nfs_2",
        text='"Inconsistency and unpredictability bother me"',
        question_type="likert",
        scale_min=1,
        scale_max=7,
        scale_labels=("Strongly Disagree", "Strongly Agree")
    ),
    SurveyQuestion(
        id="nfs_3",
        text='"I like knowing what to expect"',
        question_type="likert",
        scale_min=1,
        scale_max=7,
        scale_labels=("Strongly Disagree", "Strongly Agree")
    ),

    # Work experience
    SurveyQuestion(
        id="work_experience",
        text="Have you ever had a full-time job (>6 months)?",
        question_type="choice",
        options=["Yes", "No"]
    ),
    SurveyQuestion(
        id="recognition_importance",
        text="How important is recognition/praise to you at work?",
        question_type="likert",
        scale_min=1,
        scale_max=7,
        scale_labels=("Not at all important", "Extremely important")
    ),
]


# DEMOGRAPHICS
DEMOGRAPHIC_QUESTIONS = [
    SurveyQuestion(
        id="age",
        text="Age:",
        question_type="text"
    ),
    SurveyQuestion(
        id="gender",
        text="Gender:",
        question_type="choice",
        options=["Male", "Female", "Non-binary", "Prefer not to say"]
    ),
    SurveyQuestion(
        id="major",
        text="Major:",
        question_type="text"
    ),
]


# =============================================================================
# WORKING MEMORY TEST (Digit Span)
# =============================================================================

class DigitSpanTest:
    """
    Implements a digit span forward test for working memory.

    Methodology:
        - Display sequence of 7 digits for 3 seconds
        - Participant types them back in order
        - Score = number of correct digits in correct positions

    Purpose:
        Working memory may moderate pattern detection (Capaldi's mechanism).
        Higher WM → Better pattern detection → Stronger N→R effect
    """

    def __init__(self, n_digits: int = 7, display_time: float = 3.0):
        self.n_digits = n_digits
        self.display_time = display_time
        self.sequence = self._generate_sequence()

    def _generate_sequence(self) -> List[int]:
        """Generate random digit sequence."""
        return [random.randint(1, 9) for _ in range(self.n_digits)]

    def get_sequence_string(self) -> str:
        """Get sequence as display string."""
        return " — ".join(str(d) for d in self.sequence)

    def score_response(self, response: str) -> int:
        """
        Score participant's response.

        Args:
            response: String of digits entered by participant

        Returns:
            Number of correct digits in correct positions (0 to n_digits)
        """
        # Clean response
        response_clean = ''.join(c for c in response if c.isdigit())

        # Score position-by-position
        correct = 0
        for i, digit in enumerate(str(d) for d in self.sequence):
            if i < len(response_clean) and response_clean[i] == digit:
                correct += 1

        return correct


# =============================================================================
# EXPERIMENT CLASS
# =============================================================================

class CareerChoiceExperiment:
    """
    Main class for running the Career Choice Survey experiment.

    This class manages:
        - Scenario presentation order (randomized)
        - Question administration
        - Data collection and storage
        - Manipulation check scoring
    """

    def __init__(self, participant_id: str):
        """
        Initialize experiment for a participant.

        Args:
            participant_id: Unique identifier for participant
        """
        self.participant_id = participant_id
        self.config = ExperimentConfig()

        # Randomize scenario order
        self.scenario_order = self._randomize_scenario_order()

        # Initialize data storage
        self.data = {
            'participant_id': participant_id,
            'start_time': datetime.now().isoformat(),
            'scenario_order': [s.id for s in self.scenario_order],
            'scenario_responses': {},
            'comparative_responses': {},
            'manipulation_checks': {},
            'mechanism_responses': {},
            'individual_differences': {},
            'demographics': {},
            'working_memory': {},
        }

    def _randomize_scenario_order(self) -> List[CompanyScenario]:
        """
        Randomize the order of scenario presentation.

        Returns:
            List of scenarios in randomized order
        """
        scenarios = ALL_SCENARIOS.copy()
        random.shuffle(scenarios)
        return scenarios

    def record_scenario_response(self, scenario_id: str, question_id: str,
                                  response: any):
        """Record response to a scenario question."""
        if scenario_id not in self.data['scenario_responses']:
            self.data['scenario_responses'][scenario_id] = {}
        self.data['scenario_responses'][scenario_id][question_id] = response

    def record_manipulation_check(self, check_id: str, response: any):
        """Record response to a manipulation check."""
        self.data['manipulation_checks'][check_id] = response

    def record_mechanism_response(self, question_id: str, response: any):
        """Record response to a mechanism question."""
        self.data['mechanism_responses'][question_id] = response

    def record_comparative_response(self, question_id: str, response: any):
        """Record response to a comparative question (ranking, forced_choice)."""
        self.data['comparative_responses'][question_id] = response

    def record_individual_difference(self, question_id: str, response: any):
        """Record response to an individual-difference question (NFS, work_experience, etc.)."""
        self.data['individual_differences'][question_id] = response

    def record_demographic(self, question_id: str, response: any):
        """Record a demographic response (age, gender, major)."""
        self.data['demographics'][question_id] = response

    def record_working_memory(self, score: int, max_score: int,
                              sequence: Optional[List[int]] = None,
                              response: Optional[str] = None):
        """Record digit-span working memory result.

        Args:
            score: Number of correct digits in correct positions.
            max_score: Length of the displayed sequence.
            sequence: The digits actually shown (optional, for replay/debug).
            response: Raw participant response string (optional).
        """
        self.data['working_memory'] = {
            'score': score,
            'max_score': max_score,
            'sequence': sequence,
            'response': response,
        }

    def score_manipulation_checks(self) -> Dict[str, bool]:
        """
        Score manipulation check responses.

        Returns:
            Dictionary of check_id: passed (bool)
        """
        checks = self.data['manipulation_checks']
        results = {}

        # Check spotlight counts (all should be 12)
        for company in ['A', 'B', 'C']:
            key = f'check_spotlights_{company}'
            if key in checks:
                try:
                    results[key] = int(checks[key]) == 12
                except (ValueError, TypeError):
                    results[key] = False

        # Check work identification
        if 'check_work' in checks:
            results['check_work'] = checks['check_work'] == 'Company B'

        # Check pattern identification
        if 'check_pattern' in checks:
            results['check_pattern'] = 'Alternating' in checks['check_pattern']

        return results

    def should_exclude(self) -> Tuple[bool, List[str]]:
        """
        Determine if participant should be excluded based on preregistered criteria.

        Returns:
            (should_exclude: bool, reasons: list of strings)
        """
        reasons = []

        # Check manipulation checks
        check_results = self.score_manipulation_checks()

        # Failed spotlight count for any company
        for company in ['A', 'B', 'C']:
            key = f'check_spotlights_{company}'
            if key in check_results and not check_results[key]:
                reasons.append(f"Failed spotlight count for Company {company}")

        # Failed work identification
        if 'check_work' in check_results and not check_results['check_work']:
            reasons.append("Failed to identify which company required work")

        # Failed pattern identification
        if 'check_pattern' in check_results and not check_results['check_pattern']:
            reasons.append("Failed to identify Company C's alternating pattern")

        return len(reasons) > 0, reasons

    def get_scenario_text(self, scenario: CompanyScenario) -> str:
        """Get the full display text for a scenario."""
        return scenario.description

    def save_data(self, output_dir: str = "data/"):
        """Save experiment data to JSON file."""
        self.data['end_time'] = datetime.now().isoformat()

        # Add exclusion info
        should_exclude, reasons = self.should_exclude()
        self.data['should_exclude'] = should_exclude
        self.data['exclusion_reasons'] = reasons
        self.data['manipulation_check_results'] = self.score_manipulation_checks()

        # Create output directory
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # Generate filename
        filename = os.path.join(
            output_dir,
            f"career_survey_{self.participant_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )

        with open(filename, 'w') as f:
            json.dump(self.data, f, indent=2)

        return filename


# =============================================================================
# QUALTRICS JAVASCRIPT HELPERS
# =============================================================================

def generate_qualtrics_js_digit_span() -> str:
    """
    Generate JavaScript code for digit span test in Qualtrics.

    This can be added to a Qualtrics question's JavaScript editor.
    """
    js_code = '''
/*
 * DIGIT SPAN WORKING MEMORY TEST
 * For Experiment 2: Career Choice Study
 *
 * How to use:
 * 1. Create a "Text/Graphic" question in Qualtrics
 * 2. Add this code to the question's JavaScript
 * 3. Create a following "Text Entry" question to capture response
 * 4. Set embedded data field "WM_Score" to store the score
 */

Qualtrics.SurveyEngine.addOnload(function() {
    // Configuration
    var DISPLAY_TIME_MS = 3000;  // 3 seconds
    var N_DIGITS = 7;

    // Generate random sequence
    var sequence = [];
    for (var i = 0; i < N_DIGITS; i++) {
        sequence.push(Math.floor(Math.random() * 9) + 1);
    }

    // Store sequence in embedded data for scoring
    Qualtrics.SurveyEngine.setEmbeddedData("digit_sequence", sequence.join(""));

    // Get question container
    var container = this.getQuestionContainer();
    var questionText = container.querySelector(".QuestionText");

    // Display sequence
    questionText.innerHTML = '<div style="font-size: 48px; text-align: center; font-family: monospace; letter-spacing: 20px;">' +
        sequence.join(" — ") + '</div>';

    // Hide next button during display
    var nextButton = document.getElementById("NextButton");
    if (nextButton) {
        nextButton.style.display = "none";
    }

    // Auto-advance after display time
    var self = this;
    setTimeout(function() {
        self.clickNextButton();
    }, DISPLAY_TIME_MS);
});

Qualtrics.SurveyEngine.addOnReady(function() {
    // Additional setup if needed
});

Qualtrics.SurveyEngine.addOnUnload(function() {
    // Cleanup
});
'''
    return js_code


def generate_qualtrics_js_scoring() -> str:
    """
    Generate JavaScript for scoring digit span response in Qualtrics.
    """
    js_code = '''
/*
 * DIGIT SPAN SCORING
 * Add this to the "Text Entry" question that follows digit display
 */

Qualtrics.SurveyEngine.addOnPageSubmit(function() {
    // Get stored sequence and response
    var sequence = Qualtrics.SurveyEngine.getEmbeddedData("digit_sequence");
    var response = this.getTextValue().replace(/[^0-9]/g, "");  // Clean input

    // Score position-by-position
    var score = 0;
    for (var i = 0; i < sequence.length; i++) {
        if (i < response.length && response[i] === sequence[i]) {
            score++;
        }
    }

    // Store score
    Qualtrics.SurveyEngine.setEmbeddedData("WM_Score", score);
});
'''
    return js_code


# =============================================================================
# SURVEY STRUCTURE GENERATOR
# =============================================================================

def generate_survey_structure() -> Dict:
    """
    Generate the complete survey structure for implementation.

    Returns:
        Dictionary describing all blocks, questions, and flow
    """
    structure = {
        'metadata': {
            'name': 'Career Choice Study',
            'version': '1.0.0',
            'estimated_time': '12 minutes',
        },
        'blocks': [],
        'flow': [],
    }

    # Block 1: Consent & Instructions
    structure['blocks'].append({
        'id': 'consent',
        'name': 'Consent and Instructions',
        'questions': [{
            'type': 'text',
            'content': """
CAREER SURVEY

Imagine you're graduating and comparing job offers.

You'll see 3 startup companies. They're identical except for their
EMPLOYEE RECOGNITION PROGRAM.

For each company, you'll answer:
1. How attractive is this job?
2. How long would you stay?
3. How much would you value the recognition?

Take your time. There are no right answers—we want YOUR honest preferences.

This should take about 12 minutes.
"""
        }]
    })

    # Blocks 2-4: Scenario blocks (will be randomized)
    for scenario in ALL_SCENARIOS:
        block = {
            'id': f'scenario_{scenario.id}',
            'name': f'Scenario {scenario.id}: {scenario.name}',
            'questions': [
                {
                    'type': 'text',
                    'content': scenario.description,
                }
            ]
        }

        # Add scenario questions
        for q in SCENARIO_QUESTIONS:
            block['questions'].append({
                'id': f'{q.id}_{scenario.id}',
                'type': q.question_type,
                'text': q.text,
                'options': q.options,
                'scale_min': q.scale_min,
                'scale_max': q.scale_max,
                'scale_labels': q.scale_labels,
            })

        # Add condition-specific questions
        for q in CONDITION_SPECIFIC_QUESTIONS.get(scenario.id, []):
            block['questions'].append({
                'id': q.id,
                'type': q.question_type,
                'text': q.text,
                'scale_min': q.scale_min,
                'scale_max': q.scale_max,
                'scale_labels': q.scale_labels,
            })

        structure['blocks'].append(block)

    # Block 5: Comparative questions
    structure['blocks'].append({
        'id': 'comparative',
        'name': 'Comparative Judgments',
        'questions': [
            {
                'id': q.id,
                'type': q.question_type,
                'text': q.text,
                'options': q.options,
            }
            for q in COMPARATIVE_QUESTIONS
        ]
    })

    # Block 6: Manipulation checks
    structure['blocks'].append({
        'id': 'manipulation_checks',
        'name': 'Comprehension Questions',
        'questions': [
            {
                'id': q.id,
                'type': q.question_type,
                'text': q.text,
                'options': q.options,
            }
            for q in MANIPULATION_CHECKS
        ]
    })

    # Block 7: Mechanism questions
    structure['blocks'].append({
        'id': 'mechanisms',
        'name': 'Your Thoughts',
        'questions': [
            {
                'id': q.id,
                'type': q.question_type,
                'text': q.text,
                'scale_min': q.scale_min,
                'scale_max': q.scale_max,
                'scale_labels': q.scale_labels,
            }
            for q in MECHANISM_QUESTIONS
        ]
    })

    # Block 8: Working memory
    structure['blocks'].append({
        'id': 'working_memory',
        'name': 'Memory Test',
        'questions': [
            {
                'type': 'digit_span',
                'n_digits': 7,
                'display_time': 3,
                'instructions': "You'll see a sequence of numbers for 3 seconds. Then type them back in the same order."
            }
        ]
    })

    # Block 9: Individual differences
    structure['blocks'].append({
        'id': 'individual_differences',
        'name': 'About You',
        'questions': [
            {
                'id': q.id,
                'type': q.question_type,
                'text': q.text,
                'options': q.options,
                'scale_min': q.scale_min,
                'scale_max': q.scale_max,
                'scale_labels': q.scale_labels,
            }
            for q in INDIVIDUAL_DIFFERENCE_QUESTIONS
        ]
    })

    # Block 10: Demographics
    structure['blocks'].append({
        'id': 'demographics',
        'name': 'Demographics',
        'questions': [
            {
                'id': q.id,
                'type': q.question_type,
                'text': q.text,
                'options': q.options,
            }
            for q in DEMOGRAPHIC_QUESTIONS
        ]
    })

    # Define flow (scenario blocks randomized)
    structure['flow'] = [
        {'type': 'block', 'id': 'consent'},
        {'type': 'randomizer', 'blocks': ['scenario_A', 'scenario_B', 'scenario_C']},
        {'type': 'block', 'id': 'comparative'},
        {'type': 'block', 'id': 'manipulation_checks'},
        {'type': 'block', 'id': 'mechanisms'},
        {'type': 'block', 'id': 'working_memory'},
        {'type': 'block', 'id': 'individual_differences'},
        {'type': 'block', 'id': 'demographics'},
    ]

    return structure


# =============================================================================
# EXPORT FUNCTIONS
# =============================================================================

def export_survey_structure(output_path: str = "survey_structure.json"):
    """Export survey structure to JSON file."""
    structure = generate_survey_structure()

    with open(output_path, 'w') as f:
        json.dump(structure, f, indent=2)

    print(f"Survey structure exported to: {output_path}")
    return structure


def export_qualtrics_javascript(output_dir: str = "."):
    """Export Qualtrics JavaScript files."""
    # Digit span display
    with open(os.path.join(output_dir, "qualtrics_digit_span_display.js"), 'w') as f:
        f.write(generate_qualtrics_js_digit_span())

    # Digit span scoring
    with open(os.path.join(output_dir, "qualtrics_digit_span_score.js"), 'w') as f:
        f.write(generate_qualtrics_js_scoring())

    print(f"Qualtrics JavaScript files exported to: {output_dir}")


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == '__main__':
    print("=" * 70)
    print("EXPERIMENT 2: CAREER CHOICE STUDY")
    print("=" * 70)
    print()

    # Export survey structure
    export_survey_structure()

    # Export Qualtrics JavaScript
    export_qualtrics_javascript()

    print()
    print("Files generated successfully!")
    print()
    print("To run a demo experiment:")
    print("  exp = CareerChoiceExperiment('demo_001')")
    print("  exp.record_scenario_response('A', 'tenure', 12)")
    print("  exp.save_data()")
