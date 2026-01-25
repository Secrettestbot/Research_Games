#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
================================================================================
EXPERIMENT 1: THE DIGITAL TREASURE HUNT
================================================================================

Description:
    A behavioral task testing persistence under extinction, designed to compare
    Festinger's Cognitive Dissonance Theory vs. Capaldi's Sequential Theory.

    Participants click treasure chests to collect gold coins. After acquisition
    (where patterns/effort are manipulated), they enter an extinction phase
    where all chests are empty. The primary DV is how many chests they open
    before quitting.

Theoretical Background:
    - FESTINGER (1957): Effort creates value through dissonance reduction
      Prediction: HIGH EFFORT > BASELINE (worked hard = must be valuable)

    - CAPALDI (1967): N→R sequences create persistent expectations
      Prediction: N→R > BASELINE (learned "empty predicts reward")

Conditions (Between-Subjects, n=80 each):
    1. BASELINE: Random sequence, 3 clicks per chest
    2. HIGH_EFFORT: Random sequence, 10 clicks for coin chests, 3 for empty
    3. NR_PATTERN: Alternating ❌✓❌✓ sequence, 3 clicks per chest
    4. RN_PATTERN: Alternating ✓❌✓❌ sequence, 3 clicks per chest

Primary DV:
    Number of chests opened in extinction (0-30) before clicking "I'M DONE"

Platform:
    PsychoPy 2023.x+ / Pavlovia for online deployment

Author: Research Games Project
Date: January 2025
Reference: Festinger (1957), Capaldi (1967)
================================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

from psychopy import visual, core, event, data, gui, logging
from psychopy.hardware import keyboard
import random
import os
import json
from datetime import datetime

# =============================================================================
# CONFIGURATION CONSTANTS
# =============================================================================

# --- Experiment Parameters ---
EXPERIMENT_NAME = "TreasureHunt"
EXPERIMENT_VERSION = "1.0.0"

# --- Timing Parameters (in seconds) ---
TIMING = {
    'instruction_min_time': 2.0,      # Minimum time on instruction screens
    'chest_display_time': 0.5,        # Time to show chest before clicks register
    'outcome_display_time': 1.5,      # Time to show outcome (coins/empty)
    'feedback_display_time': 1.0,     # Time to show click feedback
    'inter_trial_interval': 0.3,      # Blank screen between trials
    'click_timeout': 10.0,            # Max time allowed per chest (seconds)
}

# --- Click Requirements ---
CLICKS = {
    'baseline': 3,           # Standard clicks to open any chest
    'high_effort_reward': 10, # Clicks for coin chests in HIGH_EFFORT condition
    'high_effort_empty': 3,   # Clicks for empty chests in HIGH_EFFORT condition
    'click_window': 2.0,      # Time window for rapid clicking (seconds)
}

# --- Trial Numbers ---
TRIALS = {
    'practice': 5,           # Number of practice trials
    'acquisition': 20,       # Number of acquisition trials
    'extinction_max': 30,    # Maximum extinction trials
}

# --- Reward Values ---
REWARDS = {
    'coins_per_chest': 5,    # Gold coins in rewarded chests
    'practice_rewards': [1, 0, 1, 1, 0],  # Practice trial outcomes (1=coin, 0=empty)
}

# --- Conditions ---
CONDITIONS = ['BASELINE', 'HIGH_EFFORT', 'NR_PATTERN', 'RN_PATTERN']

# --- Colors ---
COLORS = {
    'background': '#2C3E50',      # Dark blue-gray
    'text': '#ECF0F1',            # Light gray
    'gold': '#F1C40F',            # Gold for coins
    'red': '#E74C3C',             # Red for empty/quit button
    'green': '#27AE60',           # Green for success
    'button_bg': '#34495E',       # Button background
    'progress_bar': '#3498DB',    # Progress bar color
}


# =============================================================================
# SEQUENCE GENERATORS
# =============================================================================

def generate_baseline_sequence(n_trials=20, n_rewards=10):
    """
    Generate a randomized sequence for BASELINE and HIGH_EFFORT conditions.

    Parameters:
        n_trials (int): Total number of trials
        n_rewards (int): Number of rewarded (coin) trials

    Returns:
        list: Sequence of 1s (coin) and 0s (empty)

    Theory Note:
        Random sequences should not create systematic N→R expectations.
        Both Festinger and Capaldi predict this as control condition.
    """
    sequence = [1] * n_rewards + [0] * (n_trials - n_rewards)
    random.shuffle(sequence)
    return sequence


def generate_nr_sequence(n_trials=20):
    """
    Generate N→R (Nonreward → Reward) alternating sequence.

    Pattern: ❌✓❌✓❌✓❌✓❌✓❌✓❌✓❌✓❌✓❌✓

    Parameters:
        n_trials (int): Total number of trials (must be even)

    Returns:
        list: Alternating sequence starting with 0 (empty)

    Theory Note (Capaldi, 1967):
        N→R sequences create strong expectations because participants learn
        "after nothing, something comes." This N→R memory persists into
        extinction, causing continued responding after empty trials.
    """
    # Start with empty (0), then coin (1), alternating
    sequence = []
    for i in range(n_trials):
        sequence.append(i % 2)  # 0, 1, 0, 1, 0, 1...
    return sequence


def generate_rn_sequence(n_trials=20):
    """
    Generate R→N (Reward → Nonreward) alternating sequence.

    Pattern: ✓❌✓❌✓❌✓❌✓❌✓❌✓❌✓❌✓❌✓❌

    Parameters:
        n_trials (int): Total number of trials (must be even)

    Returns:
        list: Alternating sequence starting with 1 (coin)

    Theory Note (Capaldi, 1967):
        R→N sequences create WEAK persistence because participants learn
        "after reward, nothing comes." In extinction (all empty), they
        don't expect rewards after empty trials.
    """
    # Start with coin (1), then empty (0), alternating
    sequence = []
    for i in range(n_trials):
        sequence.append(1 - (i % 2))  # 1, 0, 1, 0, 1, 0...
    return sequence


def get_sequence_for_condition(condition):
    """
    Get the appropriate sequence based on experimental condition.

    Parameters:
        condition (str): One of 'BASELINE', 'HIGH_EFFORT', 'NR_PATTERN', 'RN_PATTERN'

    Returns:
        list: Trial sequence (1=coin, 0=empty)
    """
    if condition in ['BASELINE', 'HIGH_EFFORT']:
        return generate_baseline_sequence()
    elif condition == 'NR_PATTERN':
        return generate_nr_sequence()
    elif condition == 'RN_PATTERN':
        return generate_rn_sequence()
    else:
        raise ValueError(f"Unknown condition: {condition}")


def get_clicks_required(condition, trial_outcome):
    """
    Determine clicks required based on condition and outcome.

    Parameters:
        condition (str): Experimental condition
        trial_outcome (int): 1 for coin, 0 for empty

    Returns:
        int: Number of clicks required to open chest

    Theory Note (Festinger, 1959):
        In HIGH_EFFORT condition, participants must work harder (more clicks)
        to obtain rewards. According to dissonance theory, this extra effort
        should increase perceived value of the reward.
    """
    if condition == 'HIGH_EFFORT':
        if trial_outcome == 1:  # Coin chest
            return CLICKS['high_effort_reward']
        else:  # Empty chest
            return CLICKS['high_effort_empty']
    else:
        return CLICKS['baseline']


# =============================================================================
# EXPERIMENT CLASS
# =============================================================================

class TreasureHuntExperiment:
    """
    Main experiment class for the Digital Treasure Hunt task.

    This class handles:
        - Window and stimulus setup
        - Trial presentation
        - Click recording
        - Data logging
        - Phase transitions (practice → acquisition → extinction)
    """

    def __init__(self, participant_info):
        """
        Initialize the experiment.

        Parameters:
            participant_info (dict): Contains 'participant_id', 'condition', etc.
        """
        self.participant_info = participant_info
        self.condition = participant_info['condition']

        # Initialize data storage
        self.data = {
            'participant_id': participant_info['participant_id'],
            'condition': self.condition,
            'start_time': datetime.now().isoformat(),
            'practice_trials': [],
            'acquisition_trials': [],
            'extinction_trials': [],
            'survey_responses': {},
        }

        # Running totals
        self.total_coins = 0
        self.practice_coins = 0

        # Setup window and stimuli
        self._setup_window()
        self._setup_stimuli()
        self._setup_keyboard()

    def _setup_window(self):
        """Create the PsychoPy window."""
        self.win = visual.Window(
            size=[1920, 1080],
            fullscr=True,
            color=COLORS['background'],
            units='height',
            allowGUI=False,
        )

    def _setup_stimuli(self):
        """
        Create all visual stimuli used in the experiment.

        Stimuli include:
            - Instruction text
            - Treasure chest image (or placeholder)
            - Coin display
            - Progress bar
            - Outcome messages
            - Quit button
        """
        # --- Text Stimuli ---
        self.instruction_text = visual.TextStim(
            self.win,
            text='',
            color=COLORS['text'],
            height=0.04,
            wrapWidth=0.8,
            alignText='center',
        )

        self.title_text = visual.TextStim(
            self.win,
            text='',
            color=COLORS['gold'],
            height=0.06,
            pos=(0, 0.35),
            bold=True,
        )

        # --- Treasure Chest (Rectangle placeholder - replace with image in production) ---
        self.chest = visual.Rect(
            self.win,
            width=0.25,
            height=0.2,
            pos=(0, 0),
            fillColor='#8B4513',  # Brown
            lineColor='#654321',
            lineWidth=3,
        )

        self.chest_lid = visual.Rect(
            self.win,
            width=0.27,
            height=0.05,
            pos=(0, 0.125),
            fillColor='#A0522D',
            lineColor='#654321',
            lineWidth=2,
        )

        self.chest_lock = visual.Circle(
            self.win,
            radius=0.02,
            pos=(0, 0.05),
            fillColor=COLORS['gold'],
            lineColor='#B8860B',
        )

        # --- Click Counter / Progress Bar ---
        self.progress_bg = visual.Rect(
            self.win,
            width=0.4,
            height=0.03,
            pos=(0, -0.2),
            fillColor='#1a1a2e',
            lineColor=COLORS['text'],
        )

        self.progress_bar = visual.Rect(
            self.win,
            width=0.0,  # Will be updated
            height=0.028,
            pos=(-0.2, -0.2),  # Left-aligned
            fillColor=COLORS['progress_bar'],
            lineColor=None,
            anchor='left',
        )

        self.click_text = visual.TextStim(
            self.win,
            text='Click the chest!',
            color=COLORS['text'],
            height=0.03,
            pos=(0, -0.27),
        )

        # --- Outcome Display ---
        self.outcome_text = visual.TextStim(
            self.win,
            text='',
            color=COLORS['text'],
            height=0.05,
            pos=(0, -0.05),
        )

        self.coin_display = visual.TextStim(
            self.win,
            text='',
            color=COLORS['gold'],
            height=0.08,
            pos=(0, 0),
            bold=True,
        )

        # --- Coin Counter (top right) ---
        self.coin_counter = visual.TextStim(
            self.win,
            text='Coins: 0',
            color=COLORS['gold'],
            height=0.035,
            pos=(0.35, 0.42),
            alignText='right',
        )

        # --- Quit Button (for extinction phase) ---
        self.quit_button = visual.Rect(
            self.win,
            width=0.25,
            height=0.06,
            pos=(0.3, -0.4),
            fillColor=COLORS['red'],
            lineColor='#C0392B',
            lineWidth=2,
        )

        self.quit_button_text = visual.TextStim(
            self.win,
            text="I'M DONE HUNTING",
            color=COLORS['text'],
            height=0.022,
            pos=(0.3, -0.4),
            bold=True,
        )

        # --- Continue Button ---
        self.continue_button = visual.Rect(
            self.win,
            width=0.2,
            height=0.05,
            pos=(0, -0.35),
            fillColor=COLORS['green'],
            lineColor='#1E8449',
            lineWidth=2,
        )

        self.continue_text = visual.TextStim(
            self.win,
            text='CONTINUE',
            color=COLORS['text'],
            height=0.025,
            pos=(0, -0.35),
            bold=True,
        )

        # --- Mouse ---
        self.mouse = event.Mouse(win=self.win)

    def _setup_keyboard(self):
        """Setup keyboard for responses."""
        self.kb = keyboard.Keyboard()

    def draw_chest(self, opened=False):
        """
        Draw the treasure chest.

        Parameters:
            opened (bool): Whether to show chest as opened
        """
        if not opened:
            self.chest.draw()
            self.chest_lid.draw()
            self.chest_lock.draw()
        else:
            # Draw opened chest (lid moved up)
            self.chest.draw()
            opened_lid = visual.Rect(
                self.win,
                width=0.27,
                height=0.05,
                pos=(0, 0.2),
                fillColor='#A0522D',
                lineColor='#654321',
                lineWidth=2,
                ori=15,  # Tilted
            )
            opened_lid.draw()

    def show_instructions(self, text, title='', wait_for_click=True, min_time=2.0):
        """
        Display instruction screen.

        Parameters:
            text (str): Instruction text to display
            title (str): Optional title at top
            wait_for_click (bool): Wait for mouse click to continue
            min_time (float): Minimum display time before allowing continue
        """
        self.title_text.text = title
        self.instruction_text.text = text

        timer = core.Clock()

        while True:
            self.title_text.draw()
            self.instruction_text.draw()

            # Show continue button after minimum time
            if timer.getTime() >= min_time:
                self.continue_button.draw()
                self.continue_text.draw()

                if wait_for_click:
                    if self.mouse.isPressedIn(self.continue_button):
                        # Wait for release
                        while self.mouse.isPressedIn(self.continue_button):
                            self.win.flip()
                        break

            self.win.flip()

            # Check for escape
            if event.getKeys(['escape']):
                self.quit_experiment()

    def run_clicking_trial(self, clicks_required, show_quit_button=False):
        """
        Run a single clicking trial (chest opening).

        Parameters:
            clicks_required (int): Number of clicks needed to open chest
            show_quit_button (bool): Whether to show quit button (extinction phase)

        Returns:
            dict: Trial data including clicks, time, quit status

        Methodology Note:
            Click counting uses mouse press detection with debouncing.
            Progress bar provides feedback on click progress.
        """
        click_count = 0
        trial_clock = core.Clock()
        last_click_time = -1.0  # For debouncing
        debounce_time = 0.1  # Minimum time between registered clicks
        quit_pressed = False

        # Reset mouse
        self.mouse.clickReset()

        while click_count < clicks_required:
            # Draw chest and progress
            self.draw_chest(opened=False)

            # Update progress bar
            progress_width = 0.4 * (click_count / clicks_required)
            self.progress_bar.width = progress_width
            self.progress_bar.pos = (-0.2 + progress_width/2, -0.2)

            self.progress_bg.draw()
            self.progress_bar.draw()

            click_instruction = f'Click rapidly! ({click_count}/{clicks_required})'
            self.click_text.text = click_instruction
            self.click_text.draw()

            # Draw coin counter
            self.coin_counter.draw()

            # Draw quit button if in extinction
            if show_quit_button:
                self.quit_button.draw()
                self.quit_button_text.draw()

                # Check quit button
                if self.mouse.isPressedIn(self.quit_button):
                    quit_pressed = True
                    break

            self.win.flip()

            # Check for chest clicks (with debouncing)
            current_time = trial_clock.getTime()
            if self.mouse.isPressedIn(self.chest) or self.mouse.isPressedIn(self.chest_lid):
                if current_time - last_click_time > debounce_time:
                    click_count += 1
                    last_click_time = current_time

            # Timeout check
            if trial_clock.getTime() > TIMING['click_timeout']:
                break

            # Escape check
            if event.getKeys(['escape']):
                self.quit_experiment()

        return {
            'clicks': click_count,
            'time': trial_clock.getTime(),
            'completed': click_count >= clicks_required,
            'quit_pressed': quit_pressed,
        }

    def show_outcome(self, is_reward, coins=5):
        """
        Display trial outcome (coins or empty).

        Parameters:
            is_reward (bool): Whether chest contained coins
            coins (int): Number of coins if rewarded
        """
        outcome_clock = core.Clock()

        while outcome_clock.getTime() < TIMING['outcome_display_time']:
            self.draw_chest(opened=True)

            if is_reward:
                self.coin_display.text = f'+{coins} COINS!'
                self.coin_display.color = COLORS['gold']
                self.outcome_text.text = 'You found treasure!'
                self.outcome_text.color = COLORS['green']
            else:
                self.coin_display.text = 'EMPTY'
                self.coin_display.color = COLORS['red']
                self.outcome_text.text = ''

            self.coin_display.draw()
            self.outcome_text.draw()
            self.coin_counter.draw()

            self.win.flip()

            if event.getKeys(['escape']):
                self.quit_experiment()

    def run_practice_phase(self):
        """
        Run the practice phase (5 trials).

        Purpose:
            Familiarize participants with clicking mechanic.
            All participants get same practice sequence (3 coins, 2 empty).
        """
        # Practice instructions
        self.show_instructions(
            title='PRACTICE ROUND',
            text="""Let's practice opening treasure chests!

Click the chest repeatedly until it opens.
You need about 3 clicks within a few seconds.

Some chests contain GOLD COINS
Some chests are EMPTY

Try to collect as many coins as possible!""",
        )

        practice_sequence = REWARDS['practice_rewards']

        for i, outcome in enumerate(practice_sequence):
            # Show trial number
            self.title_text.text = f'Practice Trial {i+1}/{len(practice_sequence)}'

            # Run clicking
            trial_data = self.run_clicking_trial(
                clicks_required=CLICKS['baseline'],
                show_quit_button=False,
            )

            # Show outcome
            if trial_data['completed']:
                is_reward = outcome == 1
                if is_reward:
                    self.practice_coins += REWARDS['coins_per_chest']
                self.show_outcome(is_reward, REWARDS['coins_per_chest'])

            # Update coin counter
            self.coin_counter.text = f'Coins: {self.practice_coins}'

            # Store practice data
            trial_data['trial_num'] = i + 1
            trial_data['outcome'] = outcome
            self.data['practice_trials'].append(trial_data)

            # Brief inter-trial interval
            core.wait(TIMING['inter_trial_interval'])

        # Practice complete message
        self.show_instructions(
            title='PRACTICE COMPLETE!',
            text=f"""Great job! You collected {self.practice_coins} practice coins.

Now the REAL treasure hunt begins!

You'll have {TRIALS['acquisition']} treasure chests to open.
Try to collect as many coins as possible!""",
        )

    def run_acquisition_phase(self):
        """
        Run the acquisition phase (20 trials).

        This is where the experimental manipulation occurs:
            - BASELINE: Random sequence, 3 clicks per chest
            - HIGH_EFFORT: Random sequence, 10 clicks for coins
            - NR_PATTERN: Alternating empty→coin sequence
            - RN_PATTERN: Alternating coin→empty sequence

        Theory Notes:
            Festinger: HIGH_EFFORT should create dissonance → increased value
            Capaldi: NR_PATTERN should create N→R expectation → persistence
        """
        # Get sequence for this condition
        sequence = get_sequence_for_condition(self.condition)

        # Reset coins for acquisition
        self.total_coins = 0
        self.coin_counter.text = f'Coins: {self.total_coins}'

        for i, outcome in enumerate(sequence):
            # Determine clicks required based on condition
            clicks_needed = get_clicks_required(self.condition, outcome)

            # Show trial number
            self.title_text.text = f'Chest {i+1}/{len(sequence)}'

            # Run clicking trial
            trial_data = self.run_clicking_trial(
                clicks_required=clicks_needed,
                show_quit_button=False,
            )

            # Process outcome
            if trial_data['completed']:
                is_reward = outcome == 1
                if is_reward:
                    self.total_coins += REWARDS['coins_per_chest']
                    self.coin_counter.text = f'Coins: {self.total_coins}'
                self.show_outcome(is_reward, REWARDS['coins_per_chest'])

            # Store acquisition data
            trial_data['trial_num'] = i + 1
            trial_data['outcome'] = outcome
            trial_data['clicks_required'] = clicks_needed
            trial_data['condition'] = self.condition
            self.data['acquisition_trials'].append(trial_data)

            # Inter-trial interval
            core.wait(TIMING['inter_trial_interval'])

        # Acquisition complete - transition message
        self.show_instructions(
            title='PHASE 1 COMPLETE!',
            text=f"""Excellent! You collected {self.total_coins} gold coins!

Now you've discovered a NEW AREA with up to {TRIALS['extinction_max']} more chests.

Keep opening chests - some MIGHT have coins, some MIGHT be empty.

You can stop anytime by clicking "I'M DONE HUNTING"

Ready to continue?""",
        )

    def run_extinction_phase(self):
        """
        Run the extinction phase (up to 30 trials, all empty).

        PRIMARY DEPENDENT VARIABLE:
            Number of chests opened before clicking "I'M DONE HUNTING"

        Methodological Notes:
            - All chests are empty (participant not told this)
            - Quit button always visible
            - Maximum 30 trials to prevent ceiling effects
            - Clicks required same for all conditions (3 clicks)

        Theoretical Predictions:
            Festinger: HIGH_EFFORT > BASELINE (effort = value = persistence)
            Capaldi: NR_PATTERN > BASELINE > RN_PATTERN (N→R memory = persistence)
        """
        chests_opened = 0
        quit_pressed = False

        for i in range(TRIALS['extinction_max']):
            # Show trial number
            self.title_text.text = f'Extended Hunt - Chest {i+1}'

            # Run clicking trial (quit button visible)
            trial_data = self.run_clicking_trial(
                clicks_required=CLICKS['baseline'],  # Same effort for all in extinction
                show_quit_button=True,
            )

            if trial_data['quit_pressed']:
                quit_pressed = True
                break

            if trial_data['completed']:
                chests_opened += 1
                # All extinction trials are empty
                self.show_outcome(is_reward=False)

            # Store extinction data
            trial_data['trial_num'] = i + 1
            trial_data['outcome'] = 0  # All empty
            trial_data['cumulative_opened'] = chests_opened
            self.data['extinction_trials'].append(trial_data)

            # Inter-trial interval
            core.wait(TIMING['inter_trial_interval'])

        # Store primary DV
        self.data['extinction_chests_opened'] = chests_opened
        self.data['extinction_quit_pressed'] = quit_pressed
        self.data['extinction_completed_all'] = chests_opened >= TRIALS['extinction_max']

        return chests_opened

    def run_survey(self):
        """
        Run post-experiment survey (attention checks, manipulation checks, mechanisms).

        Survey Components:
            1. Attention check (how many coins in extinction?)
            2. Pattern detection
            3. Effort perception
            4. Festinger mechanism questions
            5. Capaldi mechanism questions
            6. Value ratings
            7. Individual differences
        """
        # Note: In full implementation, this would be a complete survey
        # For PsychoPy, consider using psychopy.visual.Form or external survey

        self.show_instructions(
            title='SURVEY',
            text="""Thank you for playing Treasure Hunt!

Please answer a few questions about your experience.

(In the full implementation, this would be an interactive survey.
For now, we'll record that you reached this phase.)""",
        )

        # Placeholder for survey data
        self.data['survey_responses'] = {
            'reached_survey': True,
            'timestamp': datetime.now().isoformat(),
        }

    def show_debrief(self):
        """Display debrief information."""
        self.show_instructions(
            title='THANK YOU!',
            text=f"""Study Complete!

You collected {self.total_coins} coins in Phase 1.
You opened {self.data.get('extinction_chests_opened', 0)} chests in Phase 2.

ABOUT THIS STUDY:
We're testing two theories about persistence:
1. Does EFFORT make rewards more valuable? (Festinger)
2. Do PATTERNS create expectations? (Capaldi)

In Phase 2, all chests were actually empty.
We wanted to see how long you'd keep trying.

Thank you for contributing to science!

Your completion code: {self.generate_completion_code()}""",
        )

    def generate_completion_code(self):
        """Generate unique completion code for participant."""
        import hashlib
        data_string = f"{self.participant_info['participant_id']}{datetime.now().isoformat()}"
        return hashlib.md5(data_string.encode()).hexdigest()[:8].upper()

    def save_data(self):
        """Save experiment data to file."""
        self.data['end_time'] = datetime.now().isoformat()

        # Create data directory if needed
        data_dir = 'data'
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)

        # Generate filename
        filename = f"{data_dir}/treasure_hunt_{self.participant_info['participant_id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        with open(filename, 'w') as f:
            json.dump(self.data, f, indent=2)

        print(f"Data saved to: {filename}")
        return filename

    def quit_experiment(self):
        """Clean up and quit."""
        self.save_data()
        self.win.close()
        core.quit()

    def run(self):
        """
        Run the complete experiment.

        Sequence:
            1. Instructions
            2. Practice phase (5 trials)
            3. Acquisition phase (20 trials with manipulation)
            4. Extinction phase (up to 30 trials, all empty)
            5. Survey
            6. Debrief
        """
        try:
            # Welcome instructions
            self.show_instructions(
                title='TREASURE HUNT!',
                text=f"""Welcome to the Treasure Hunt game!

Your mission: Unlock treasure chests to collect gold coins.

IMPORTANT RULES:
1. You'll have treasure chests to open
2. Some chests contain 5 GOLD COINS
3. Some chests are EMPTY
4. Opening a chest takes work - you must click rapidly!

Your goal: Collect as many coins as possible.

Let's begin!""",
            )

            # Run experiment phases
            self.run_practice_phase()
            self.run_acquisition_phase()
            extinction_count = self.run_extinction_phase()
            self.run_survey()
            self.show_debrief()

            # Save and cleanup
            self.save_data()
            self.win.close()

        except Exception as e:
            logging.error(f"Experiment error: {e}")
            self.save_data()
            self.win.close()
            raise


# =============================================================================
# PARTICIPANT DIALOG
# =============================================================================

def get_participant_info():
    """
    Display dialog to collect participant information.

    Returns:
        dict: Participant information including ID and condition
    """
    # Participant info dialog
    info = {
        'participant_id': '',
        'age': '',
        'gender': ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
        'condition': CONDITIONS,
    }

    dlg = gui.DlgFromDict(
        dictionary=info,
        title='Treasure Hunt Study',
        order=['participant_id', 'age', 'gender', 'condition'],
    )

    if dlg.OK:
        return info
    else:
        core.quit()


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == '__main__':
    """
    Main entry point for the experiment.

    Usage:
        python treasure_hunt.py

    For Pavlovia deployment:
        - Export as JavaScript using PsychoPy Builder
        - Or use PsychoJS directly
    """
    # Get participant info
    participant_info = get_participant_info()

    # Create and run experiment
    experiment = TreasureHuntExperiment(participant_info)
    experiment.run()

    print("Experiment completed successfully!")
