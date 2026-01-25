#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
================================================================================
EXPERIMENT 3: THE PATTERN MEMORY CHALLENGE
================================================================================

Description:
    A memory and expectation task testing Capaldi's Sequential Theory.
    Participants watch a sequence of cards (ACE or BLANK), complete a distractor
    task, then report their expectations and make betting decisions.

    This experiment provides the cleanest test of sequential learning by:
    - Directly measuring expectations (not just behavior)
    - Using a behavioral betting task
    - Testing explicit pattern detection

Theoretical Background:
    CAPALDI (1967): Sequential Theory proposes that organisms learn sequences.
    When Nonreward (N) is consistently followed by Reward (R), this creates
    an N→R memory that generates expectations. After seeing N, participants
    expect R to follow.

Design:
    Between-Subjects (2 conditions):
    - N→R CONDITION: Alternating sequence (BLANK → ACE → BLANK → ACE...)
    - RANDOM CONDITION: Randomized sequence (same total of each card type)

Primary DVs:
    1. Expectation rating after seeing BLANK (1-7 scale: "What comes next?")
    2. Betting behavior: % of times betting on ACE after seeing BLANK

Sample: 240 students (120 per condition)
Time: ~10 minutes

Platform: PsychoPy / Pavlovia

Author: Research Games Project
Date: January 2025
Reference: Capaldi (1967)
================================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

from psychopy import visual, core, event, gui, logging
from psychopy.hardware import keyboard
import random
import os
import json
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field

# =============================================================================
# CONFIGURATION
# =============================================================================

@dataclass
class ExperimentConfig:
    """Configuration settings for Experiment 3."""

    # Experiment metadata
    experiment_name: str = "PatternMemoryChallenge"
    version: str = "1.0.0"

    # Card sequence parameters
    n_encoding_cards: int = 20        # Total cards in sequence
    n_aces: int = 10                  # Number of ACE cards
    n_blanks: int = 10                # Number of BLANK cards

    # Timing parameters (seconds)
    card_display_time: float = 2.0    # How long each card shows
    inter_card_interval: float = 0.5  # Blank between cards
    distractor_duration: float = 30.0 # Duration of animal naming task

    # Betting game parameters
    n_betting_trials: int = 10        # Number of betting rounds
    starting_points: int = 100        # Starting points for betting
    bet_amount: int = 10              # Points per bet

    # Display colors
    colors: Dict = field(default_factory=lambda: {
        'background': '#1a1a2e',
        'text': '#eaeaea',
        'ace': '#e74c3c',
        'blank': '#7f8c8d',
        'gold': '#f1c40f',
        'green': '#27ae60',
        'blue': '#3498db',
    })


# Global config instance
CONFIG = ExperimentConfig()

# Conditions
CONDITIONS = ['NR_PATTERN', 'RANDOM']


# =============================================================================
# SEQUENCE GENERATION
# =============================================================================

def generate_nr_sequence(n_cards: int = 20) -> List[str]:
    """
    Generate N→R (Nonreward → Reward) alternating sequence.

    Pattern: BLANK → ACE → BLANK → ACE → ...

    Args:
        n_cards: Total number of cards (must be even)

    Returns:
        List of 'ACE' and 'BLANK' strings

    Theory Note (Capaldi, 1967):
        This creates a perfect N→R association. Every BLANK (nonreward)
        is followed by ACE (reward). Participants should learn this
        contingency and expect ACE after BLANK.
    """
    sequence = []
    for i in range(n_cards):
        if i % 2 == 0:
            sequence.append('BLANK')  # N (nonreward)
        else:
            sequence.append('ACE')    # R (reward)
    return sequence


def generate_random_sequence(n_cards: int = 20, n_aces: int = 10) -> List[str]:
    """
    Generate randomized sequence with same card totals.

    Args:
        n_cards: Total number of cards
        n_aces: Number of ACE cards

    Returns:
        Shuffled list of 'ACE' and 'BLANK' strings

    Theory Note:
        Random sequences should not create systematic N→R expectations.
        Any expectation after BLANK should be around chance (50/50).
    """
    sequence = ['ACE'] * n_aces + ['BLANK'] * (n_cards - n_aces)
    random.shuffle(sequence)
    return sequence


def get_sequence_for_condition(condition: str) -> List[str]:
    """Get appropriate sequence based on condition assignment."""
    if condition == 'NR_PATTERN':
        return generate_nr_sequence(CONFIG.n_encoding_cards)
    elif condition == 'RANDOM':
        return generate_random_sequence(CONFIG.n_encoding_cards, CONFIG.n_aces)
    else:
        raise ValueError(f"Unknown condition: {condition}")


# =============================================================================
# CARD STIMULI
# =============================================================================

class CardStimulus:
    """
    Manages visual card stimuli for the experiment.

    Cards are simple rectangles with text labels:
    - ACE: Red card with "ACE" and heart symbol
    - BLANK: Gray card with "BLANK" text
    """

    def __init__(self, win: visual.Window):
        """
        Initialize card stimuli.

        Args:
            win: PsychoPy window object
        """
        self.win = win

        # Card background (shared)
        self.card_bg = visual.Rect(
            win,
            width=0.3,
            height=0.4,
            pos=(0, 0),
            lineWidth=3,
        )

        # Card text
        self.card_text = visual.TextStim(
            win,
            text='',
            height=0.08,
            pos=(0, 0),
            bold=True,
        )

        # Heart symbol for ACE
        self.heart = visual.TextStim(
            win,
            text='♥',
            height=0.15,
            pos=(0, -0.1),
            color=CONFIG.colors['ace'],
        )

    def draw_ace(self):
        """Draw ACE card (red with heart)."""
        self.card_bg.fillColor = '#ffffff'
        self.card_bg.lineColor = CONFIG.colors['ace']
        self.card_bg.draw()

        self.card_text.text = 'ACE'
        self.card_text.color = CONFIG.colors['ace']
        self.card_text.pos = (0, 0.1)
        self.card_text.draw()

        self.heart.draw()

    def draw_blank(self):
        """Draw BLANK card (gray)."""
        self.card_bg.fillColor = CONFIG.colors['blank']
        self.card_bg.lineColor = '#5d6d7e'
        self.card_bg.draw()

        self.card_text.text = 'BLANK'
        self.card_text.color = '#ffffff'
        self.card_text.pos = (0, 0)
        self.card_text.draw()

    def draw(self, card_type: str):
        """Draw specified card type."""
        if card_type == 'ACE':
            self.draw_ace()
        elif card_type == 'BLANK':
            self.draw_blank()
        else:
            raise ValueError(f"Unknown card type: {card_type}")


# =============================================================================
# BETTING GAME
# =============================================================================

@dataclass
class BettingTrial:
    """Data for a single betting trial."""
    trial_num: int
    current_card: str        # Card shown to participant
    bet_choice: str          # 'ACE', 'BLANK', or 'SKIP'
    actual_next: str         # What actually came next
    points_change: int       # Points won/lost
    response_time: float     # RT in seconds
    was_correct: bool        # Did they win the bet?


class BettingGame:
    """
    Implements the betting game for behavioral measure of expectation.

    Participants see a card and bet on what comes next.
    This provides a behavioral (not just self-report) measure of expectation.

    Critical Measure:
        % of times participant bets on ACE after seeing BLANK
        - N→R condition: Should be high (learned N→R association)
        - RANDOM condition: Should be ~50% (chance)
    """

    def __init__(self, win: visual.Window, condition: str):
        """
        Initialize betting game.

        Args:
            win: PsychoPy window
            condition: Experimental condition
        """
        self.win = win
        self.condition = condition
        self.points = CONFIG.starting_points
        self.trials: List[BettingTrial] = []

        # Setup stimuli
        self.card = CardStimulus(win)
        self._setup_buttons()
        self._setup_displays()

    def _setup_buttons(self):
        """Create betting buttons."""
        button_y = -0.3
        button_width = 0.2
        button_height = 0.08

        # Bet on BLANK button
        self.btn_blank = visual.Rect(
            self.win,
            width=button_width,
            height=button_height,
            pos=(-0.25, button_y),
            fillColor=CONFIG.colors['blank'],
            lineColor='white',
        )
        self.btn_blank_text = visual.TextStim(
            self.win,
            text='Bet BLANK',
            height=0.03,
            pos=(-0.25, button_y),
            color='white',
        )

        # Bet on ACE button
        self.btn_ace = visual.Rect(
            self.win,
            width=button_width,
            height=button_height,
            pos=(0, button_y),
            fillColor=CONFIG.colors['ace'],
            lineColor='white',
        )
        self.btn_ace_text = visual.TextStim(
            self.win,
            text='Bet ACE',
            height=0.03,
            pos=(0, button_y),
            color='white',
        )

        # Skip button
        self.btn_skip = visual.Rect(
            self.win,
            width=button_width,
            height=button_height,
            pos=(0.25, button_y),
            fillColor='#34495e',
            lineColor='white',
        )
        self.btn_skip_text = visual.TextStim(
            self.win,
            text='SKIP',
            height=0.03,
            pos=(0.25, button_y),
            color='white',
        )

    def _setup_displays(self):
        """Create display elements."""
        # Points display
        self.points_display = visual.TextStim(
            self.win,
            text='',
            height=0.04,
            pos=(0.35, 0.4),
            color=CONFIG.colors['gold'],
        )

        # Trial counter
        self.trial_display = visual.TextStim(
            self.win,
            text='',
            height=0.03,
            pos=(-0.35, 0.4),
            color=CONFIG.colors['text'],
        )

        # Instruction text
        self.instruction = visual.TextStim(
            self.win,
            text='What comes NEXT?',
            height=0.04,
            pos=(0, 0.3),
            color=CONFIG.colors['text'],
        )

        # Feedback text
        self.feedback = visual.TextStim(
            self.win,
            text='',
            height=0.05,
            pos=(0, -0.15),
        )

        # Mouse
        self.mouse = event.Mouse(win=self.win)

    def draw_game_screen(self, current_card: str, trial_num: int):
        """Draw the betting game screen."""
        # Update displays
        self.points_display.text = f'Points: {self.points}'
        self.trial_display.text = f'Round {trial_num}/{CONFIG.n_betting_trials}'

        # Draw elements
        self.instruction.draw()
        self.card.draw(current_card)
        self.points_display.draw()
        self.trial_display.draw()

        # Draw buttons
        self.btn_blank.draw()
        self.btn_blank_text.draw()
        self.btn_ace.draw()
        self.btn_ace_text.draw()
        self.btn_skip.draw()
        self.btn_skip_text.draw()

    def get_bet_choice(self) -> Tuple[str, float]:
        """
        Wait for participant to click a betting button.

        Returns:
            (choice, response_time): Button clicked and RT
        """
        trial_clock = core.Clock()
        self.mouse.clickReset()

        while True:
            # Check button clicks
            if self.mouse.isPressedIn(self.btn_blank):
                return 'BLANK', trial_clock.getTime()
            elif self.mouse.isPressedIn(self.btn_ace):
                return 'ACE', trial_clock.getTime()
            elif self.mouse.isPressedIn(self.btn_skip):
                return 'SKIP', trial_clock.getTime()

            # Check escape
            if event.getKeys(['escape']):
                return 'ESCAPE', trial_clock.getTime()

            self.win.flip()

    def show_feedback(self, was_correct: bool, points_change: int):
        """Show feedback after bet."""
        if points_change > 0:
            self.feedback.text = f'+{points_change} points!'
            self.feedback.color = CONFIG.colors['green']
        elif points_change < 0:
            self.feedback.text = f'{points_change} points'
            self.feedback.color = CONFIG.colors['ace']
        else:
            self.feedback.text = 'No change'
            self.feedback.color = CONFIG.colors['text']

        self.feedback.draw()
        self.win.flip()
        core.wait(1.0)

    def run_trial(self, trial_num: int, current_card: str,
                  actual_next: str) -> BettingTrial:
        """
        Run a single betting trial.

        Args:
            trial_num: Trial number (1-indexed)
            current_card: Card shown to participant
            actual_next: What the next card actually is

        Returns:
            BettingTrial with all data
        """
        # Draw game screen
        self.draw_game_screen(current_card, trial_num)
        self.win.flip()

        # Get bet
        choice, rt = self.get_bet_choice()

        if choice == 'ESCAPE':
            return None

        # Determine outcome
        if choice == 'SKIP':
            points_change = 0
            was_correct = None
        else:
            was_correct = (choice == actual_next)
            points_change = CONFIG.bet_amount if was_correct else -CONFIG.bet_amount

        # Update points
        self.points += points_change

        # Show feedback
        self.show_feedback(was_correct, points_change)

        # Create trial data
        trial = BettingTrial(
            trial_num=trial_num,
            current_card=current_card,
            bet_choice=choice,
            actual_next=actual_next,
            points_change=points_change,
            response_time=rt,
            was_correct=was_correct,
        )

        self.trials.append(trial)
        return trial

    def get_summary_stats(self) -> Dict:
        """
        Calculate summary statistics from betting trials.

        Returns:
            Dictionary with key measures including:
            - % bet ACE after BLANK (PRIMARY DV)
        """
        # Filter trials where current card was BLANK
        blank_trials = [t for t in self.trials if t.current_card == 'BLANK']

        if not blank_trials:
            return {'pct_bet_ace_after_blank': None}

        # Count bets on ACE after seeing BLANK
        n_bet_ace = sum(1 for t in blank_trials if t.bet_choice == 'ACE')
        n_total = len([t for t in blank_trials if t.bet_choice != 'SKIP'])

        pct_ace_after_blank = (n_bet_ace / n_total * 100) if n_total > 0 else None

        return {
            'n_blank_trials': len(blank_trials),
            'n_bet_ace_after_blank': n_bet_ace,
            'n_bet_blank_after_blank': sum(1 for t in blank_trials if t.bet_choice == 'BLANK'),
            'n_skip_after_blank': sum(1 for t in blank_trials if t.bet_choice == 'SKIP'),
            'pct_bet_ace_after_blank': pct_ace_after_blank,
            'final_points': self.points,
        }


# =============================================================================
# MAIN EXPERIMENT CLASS
# =============================================================================

class PatternMemoryExperiment:
    """
    Main experiment class for the Pattern Memory Challenge.

    Phases:
        1. Instructions
        2. Encoding: Watch 20-card sequence
        3. Distractor: 30-second animal naming task
        4. Memory test: Recognition + pattern detection
        5. Expectation: "After BLANK, what comes next?" (PRIMARY DV)
        6. Betting game: Behavioral measure of expectation
        7. Mechanism questions
        8. Working memory test
        9. Debrief
    """

    def __init__(self, participant_info: Dict):
        """
        Initialize experiment.

        Args:
            participant_info: Dictionary with 'participant_id', 'condition'
        """
        self.participant_info = participant_info
        self.condition = participant_info['condition']

        # Generate sequence for this condition
        self.card_sequence = get_sequence_for_condition(self.condition)

        # Initialize data storage
        self.data = {
            'participant_id': participant_info['participant_id'],
            'condition': self.condition,
            'start_time': datetime.now().isoformat(),
            'card_sequence': self.card_sequence,
            'encoding': {},
            'distractor': {},
            'memory_test': {},
            'expectation': {},
            'betting': {},
            'mechanism': {},
            'working_memory': {},
        }

        # Setup PsychoPy
        self._setup_window()
        self._setup_stimuli()

    def _setup_window(self):
        """Create PsychoPy window."""
        self.win = visual.Window(
            size=[1920, 1080],
            fullscr=True,
            color=CONFIG.colors['background'],
            units='height',
        )

    def _setup_stimuli(self):
        """Create all visual stimuli."""
        # Card stimulus
        self.card = CardStimulus(self.win)

        # Text stimuli
        self.title = visual.TextStim(
            self.win,
            text='',
            height=0.06,
            pos=(0, 0.35),
            color=CONFIG.colors['gold'],
            bold=True,
        )

        self.instruction = visual.TextStim(
            self.win,
            text='',
            height=0.04,
            pos=(0, 0),
            color=CONFIG.colors['text'],
            wrapWidth=0.8,
            alignText='center',
        )

        self.counter = visual.TextStim(
            self.win,
            text='',
            height=0.03,
            pos=(0, -0.4),
            color=CONFIG.colors['text'],
        )

        # Continue button
        self.continue_btn = visual.Rect(
            self.win,
            width=0.2,
            height=0.06,
            pos=(0, -0.35),
            fillColor=CONFIG.colors['green'],
            lineColor='white',
        )
        self.continue_text = visual.TextStim(
            self.win,
            text='CONTINUE',
            height=0.03,
            pos=(0, -0.35),
            color='white',
        )

        # Slider for expectation rating
        self.slider = visual.Slider(
            self.win,
            ticks=[1, 2, 3, 4, 5, 6, 7],
            labels=['Definitely\nBLANK', '', '', 'Either', '', '', 'Definitely\nACE'],
            pos=(0, -0.15),
            size=(0.6, 0.05),
            style='rating',
            granularity=1,
            color=CONFIG.colors['text'],
            fillColor=CONFIG.colors['blue'],
            borderColor=CONFIG.colors['text'],
        )

        # Mouse
        self.mouse = event.Mouse(win=self.win)

    def show_instructions(self, title: str, text: str, wait_time: float = 2.0):
        """Display instruction screen."""
        self.title.text = title
        self.instruction.text = text

        timer = core.Clock()

        while True:
            self.title.draw()
            self.instruction.draw()

            if timer.getTime() >= wait_time:
                self.continue_btn.draw()
                self.continue_text.draw()

                if self.mouse.isPressedIn(self.continue_btn):
                    while self.mouse.isPressedIn(self.continue_btn):
                        self.win.flip()
                    break

            self.win.flip()

            if event.getKeys(['escape']):
                self.quit_experiment()

    # -------------------------------------------------------------------------
    # PHASE 1: ENCODING
    # -------------------------------------------------------------------------

    def run_encoding_phase(self):
        """
        Run the card sequence encoding phase.

        Participants watch 20 cards, each displayed for 2 seconds.
        They should try to remember the sequence.
        """
        # Instructions
        self.show_instructions(
            title='CARD SEQUENCE',
            text=f"""You will see {len(self.card_sequence)} playing cards, one at a time.

Each card will show for 2 seconds.

Try to remember the SEQUENCE of cards.

Pay close attention!"""
        )

        # Present sequence
        encoding_data = []

        for i, card_type in enumerate(self.card_sequence):
            # Show card
            card_clock = core.Clock()

            while card_clock.getTime() < CONFIG.card_display_time:
                self.card.draw(card_type)
                self.counter.text = f'Card {i+1}/{len(self.card_sequence)}'
                self.counter.draw()
                self.win.flip()

                if event.getKeys(['escape']):
                    self.quit_experiment()

            # Record timing
            encoding_data.append({
                'position': i + 1,
                'card_type': card_type,
                'display_time': card_clock.getTime(),
            })

            # Inter-card interval (blank screen)
            self.win.flip()
            core.wait(CONFIG.inter_card_interval)

        self.data['encoding'] = {
            'sequence': self.card_sequence,
            'trial_data': encoding_data,
        }

    # -------------------------------------------------------------------------
    # PHASE 2: DISTRACTOR
    # -------------------------------------------------------------------------

    def run_distractor_task(self):
        """
        Run the animal naming distractor task.

        Purpose: Prevent rehearsal and clear working memory.
        Participants type as many animals as they can in 30 seconds.
        """
        self.show_instructions(
            title='QUICK TASK',
            text="""Type as many ANIMALS as you can in 30 seconds.

Separate with commas.

Examples: cat, dog, elephant...

Ready?""",
            wait_time=1.0,
        )

        # Text input for animals
        animals_text = visual.TextStim(
            self.win,
            text='',
            height=0.04,
            pos=(0, 0),
            color=CONFIG.colors['text'],
            wrapWidth=0.7,
        )

        timer_display = visual.TextStim(
            self.win,
            text='',
            height=0.05,
            pos=(0, 0.35),
            color=CONFIG.colors['gold'],
        )

        prompt = visual.TextStim(
            self.win,
            text='Type animals (comma separated):',
            height=0.03,
            pos=(0, 0.2),
            color=CONFIG.colors['text'],
        )

        # Collect input for 30 seconds
        typed_text = ''
        timer = core.Clock()

        while timer.getTime() < CONFIG.distractor_duration:
            # Update timer display
            remaining = int(CONFIG.distractor_duration - timer.getTime())
            timer_display.text = f'Time: {remaining}s'

            # Get key presses
            keys = event.getKeys()
            for key in keys:
                if key == 'escape':
                    self.quit_experiment()
                elif key == 'backspace':
                    typed_text = typed_text[:-1]
                elif key == 'space':
                    typed_text += ' '
                elif key == 'comma':
                    typed_text += ', '
                elif len(key) == 1:
                    typed_text += key

            animals_text.text = typed_text

            # Draw
            timer_display.draw()
            prompt.draw()
            animals_text.draw()
            self.win.flip()

        # Parse animals
        animals_list = [a.strip() for a in typed_text.split(',') if a.strip()]

        self.data['distractor'] = {
            'raw_text': typed_text,
            'animals_list': animals_list,
            'n_animals': len(animals_list),
            'duration': timer.getTime(),
        }

    # -------------------------------------------------------------------------
    # PHASE 3: MEMORY TEST
    # -------------------------------------------------------------------------

    def run_memory_test(self):
        """
        Run memory recognition and pattern detection tests.

        Tests:
        1. Which sequence did you see? (4-option recognition)
        2. Was there a pattern? (explicit pattern detection)
        """
        # Recognition test
        self.show_instructions(
            title='MEMORY TEST',
            text="""Which sequence did you see?

Choose the one that looks most familiar.""",
            wait_time=1.0,
        )

        # Create options
        options = [
            ('A', '❌✓❌✓❌✓❌✓', 'Alternating: Blank-Ace'),
            ('B', '✓❌❌✓✓❌✓❌', 'Random mix'),
            ('C', '❌❌❌❌✓✓✓✓', 'Blanks first, then Aces'),
            ('D', '✓✓✓✓❌❌❌❌', 'Aces first, then Blanks'),
        ]

        # Correct answer based on condition
        correct_recognition = 'A' if self.condition == 'NR_PATTERN' else 'B'

        # Display options and get choice
        option_buttons = []
        for i, (letter, pattern, label) in enumerate(options):
            y_pos = 0.2 - (i * 0.12)

            btn = visual.Rect(
                self.win,
                width=0.6,
                height=0.1,
                pos=(0, y_pos),
                fillColor='#34495e',
                lineColor='white',
            )

            text = visual.TextStim(
                self.win,
                text=f'{letter}) {pattern}\n{label}',
                height=0.025,
                pos=(0, y_pos),
                color='white',
            )

            option_buttons.append((btn, text, letter))

        # Wait for choice
        choice = None
        while choice is None:
            self.title.text = 'Which sequence did you see?'
            self.title.draw()

            for btn, text, letter in option_buttons:
                btn.draw()
                text.draw()

                if self.mouse.isPressedIn(btn):
                    choice = letter
                    while self.mouse.isPressedIn(btn):
                        self.win.flip()
                    break

            self.win.flip()

            if event.getKeys(['escape']):
                self.quit_experiment()

        self.data['memory_test']['recognition_choice'] = choice
        self.data['memory_test']['recognition_correct'] = (choice == correct_recognition)

        # Pattern detection question
        self.show_instructions(
            title='PATTERN QUESTION',
            text='Was there a pattern in the card sequence?',
            wait_time=0.5,
        )

        pattern_options = [
            ('none', 'No pattern - totally random'),
            ('alternating', 'Yes - cards alternated (Blank, Ace, Blank, Ace)'),
            ('blanks_first', 'Yes - Blanks came first, then Aces'),
            ('aces_first', 'Yes - Aces came first, then Blanks'),
            ('unsure', "I'm not sure / didn't notice"),
        ]

        # Similar button display for pattern options
        pattern_choice = None
        pattern_buttons = []

        for i, (value, label) in enumerate(pattern_options):
            y_pos = 0.15 - (i * 0.1)

            btn = visual.Rect(
                self.win,
                width=0.7,
                height=0.08,
                pos=(0, y_pos),
                fillColor='#34495e',
                lineColor='white',
            )

            text = visual.TextStim(
                self.win,
                text=label,
                height=0.025,
                pos=(0, y_pos),
                color='white',
            )

            pattern_buttons.append((btn, text, value))

        while pattern_choice is None:
            self.title.text = 'Was there a pattern?'
            self.title.draw()

            for btn, text, value in pattern_buttons:
                btn.draw()
                text.draw()

                if self.mouse.isPressedIn(btn):
                    pattern_choice = value
                    while self.mouse.isPressedIn(btn):
                        self.win.flip()
                    break

            self.win.flip()

            if event.getKeys(['escape']):
                self.quit_experiment()

        correct_pattern = 'alternating' if self.condition == 'NR_PATTERN' else 'none'

        self.data['memory_test']['pattern_choice'] = pattern_choice
        self.data['memory_test']['pattern_detected'] = (pattern_choice == 'alternating')
        self.data['memory_test']['pattern_correct'] = (pattern_choice == correct_pattern)

    # -------------------------------------------------------------------------
    # PHASE 4: EXPECTATION RATING (PRIMARY DV)
    # -------------------------------------------------------------------------

    def run_expectation_test(self):
        """
        Measure explicit expectation after seeing BLANK card.

        PRIMARY DEPENDENT VARIABLE:
            Rating on 1-7 scale: "What comes next?"
            1 = Definitely BLANK
            7 = Definitely ACE

        Predictions:
            N→R condition: Should be 5-7 (expect ACE after BLANK)
            RANDOM condition: Should be 3-5 (uncertain)
        """
        self.show_instructions(
            title='PREDICTION QUESTION',
            text="""Imagine you just saw this card:

[BLANK card will appear]

What do you think comes NEXT?""",
            wait_time=1.5,
        )

        # Show BLANK card and get rating
        self.slider.reset()

        while self.slider.getRating() is None:
            # Draw BLANK card (scaled down, positioned up)
            self.card.card_bg.pos = (0, 0.15)
            self.card.card_text.pos = (0, 0.15)
            self.card.draw('BLANK')
            self.card.card_bg.pos = (0, 0)  # Reset
            self.card.card_text.pos = (0, 0)

            # Question
            question = visual.TextStim(
                self.win,
                text='The next card is most likely to be:',
                height=0.035,
                pos=(0, -0.05),
                color=CONFIG.colors['text'],
            )
            question.draw()

            # Slider
            self.slider.draw()

            # Continue button (only if rating made)
            self.win.flip()

            if event.getKeys(['escape']):
                self.quit_experiment()

        # Record PRIMARY DV
        expectation_rating = self.slider.getRating()

        self.data['expectation'] = {
            'rating': expectation_rating,
            'rating_time': self.slider.getRT(),
        }

        # Confirmation screen
        self.show_instructions(
            title='',
            text=f'You rated: {int(expectation_rating)}\n\n(1 = BLANK, 7 = ACE)',
            wait_time=1.0,
        )

    # -------------------------------------------------------------------------
    # PHASE 5: BETTING GAME
    # -------------------------------------------------------------------------

    def run_betting_game(self):
        """
        Run the betting game for behavioral measure.

        Participants bet points on what card comes next.
        Key measure: % of times betting ACE after seeing BLANK
        """
        self.show_instructions(
            title='BETTING GAME',
            text=f"""You'll now play {CONFIG.n_betting_trials} rounds of a betting game.

Each round:
1. You see a card (BLANK or ACE)
2. You bet POINTS on what comes NEXT
3. You earn points if correct, lose if wrong

Starting points: {CONFIG.starting_points}
Bet amount: {CONFIG.bet_amount} points per bet

You can also SKIP to keep your points.

Try to maximize your points!""",
        )

        # Initialize betting game
        betting_game = BettingGame(self.win, self.condition)

        # Generate betting trial sequence
        # First 5 trials: Consistent with learned pattern
        # Last 5 trials: Random
        betting_sequence = []

        for i in range(CONFIG.n_betting_trials):
            if i < 5:
                # Consistent with condition
                if self.condition == 'NR_PATTERN':
                    # BLANK → ACE, ACE → BLANK
                    current = 'BLANK' if i % 2 == 0 else 'ACE'
                    next_card = 'ACE' if current == 'BLANK' else 'BLANK'
                else:
                    # Random
                    current = random.choice(['BLANK', 'ACE'])
                    next_card = random.choice(['BLANK', 'ACE'])
            else:
                # All random for last 5 trials
                current = random.choice(['BLANK', 'ACE'])
                next_card = random.choice(['BLANK', 'ACE'])

            betting_sequence.append((current, next_card))

        # Run trials
        for i, (current, next_card) in enumerate(betting_sequence):
            trial = betting_game.run_trial(i + 1, current, next_card)

            if trial is None:  # Escape pressed
                self.quit_experiment()

        # Store results
        self.data['betting'] = {
            'trials': [vars(t) for t in betting_game.trials],
            'summary': betting_game.get_summary_stats(),
            'sequence': betting_sequence,
        }

    # -------------------------------------------------------------------------
    # PHASE 6: MECHANISM QUESTIONS
    # -------------------------------------------------------------------------

    def run_mechanism_questions(self):
        """
        Collect mechanism and individual difference measures.
        """
        questions = [
            ('confidence', 'How confident are you in your memory of the sequence?'),
            ('predictability', 'How predictable were the cards?'),
            ('could_predict', 'I could predict what card would come next'),
            ('expect_after_blank', 'After seeing a BLANK card, I expected an ACE next'),
            ('pattern_clear', 'The cards followed a clear pattern'),
            ('used_pattern', 'In the betting game, I used the pattern I noticed earlier'),
            ('task_difficult', 'Remembering the cards was difficult'),
            ('worked_hard', 'I had to work hard to remember the sequence'),
            ('frustrating', 'The memory task was frustrating'),
        ]

        responses = {}

        for q_id, q_text in questions:
            self.slider.reset()
            self.slider.labels = ['Strongly\nDisagree', '', '', 'Neutral', '', '', 'Strongly\nAgree']

            question_stim = visual.TextStim(
                self.win,
                text=q_text,
                height=0.04,
                pos=(0, 0.15),
                color=CONFIG.colors['text'],
                wrapWidth=0.8,
            )

            while self.slider.getRating() is None:
                question_stim.draw()
                self.slider.draw()
                self.win.flip()

                if event.getKeys(['escape']):
                    self.quit_experiment()

            responses[q_id] = self.slider.getRating()
            core.wait(0.3)

        self.data['mechanism'] = responses

    # -------------------------------------------------------------------------
    # PHASE 7: WORKING MEMORY TEST
    # -------------------------------------------------------------------------

    def run_working_memory_test(self):
        """
        Run digit span backward test for working memory.

        Sequence: 5 digits shown for 3 seconds
        Task: Type them BACKWARDS
        """
        self.show_instructions(
            title='MEMORY TEST',
            text="""You'll see a sequence of numbers for 3 seconds.

Then type them BACKWARDS.

Example: If you see 1-2-3, type 3-2-1

Ready?""",
        )

        # Generate sequence
        digits = [random.randint(1, 9) for _ in range(5)]
        digit_string = ' — '.join(str(d) for d in digits)

        # Display sequence
        digit_display = visual.TextStim(
            self.win,
            text=digit_string,
            height=0.1,
            pos=(0, 0),
            color=CONFIG.colors['gold'],
        )

        timer = core.Clock()
        while timer.getTime() < 3.0:
            digit_display.draw()
            remaining = 3 - int(timer.getTime())
            self.counter.text = f'{remaining}...'
            self.counter.draw()
            self.win.flip()

        # Get response
        self.show_instructions(
            title='',
            text='Type the numbers BACKWARDS:',
            wait_time=0.5,
        )

        response_text = ''
        response_display = visual.TextStim(
            self.win,
            text='',
            height=0.08,
            pos=(0, 0),
            color=CONFIG.colors['text'],
        )

        prompt = visual.TextStim(
            self.win,
            text='Type the numbers BACKWARDS, then click Continue:',
            height=0.03,
            pos=(0, 0.2),
            color=CONFIG.colors['text'],
        )

        while True:
            keys = event.getKeys()
            for key in keys:
                if key == 'escape':
                    self.quit_experiment()
                elif key == 'backspace':
                    response_text = response_text[:-1]
                elif key == 'return':
                    break
                elif key.isdigit():
                    response_text += key

            response_display.text = response_text
            prompt.draw()
            response_display.draw()
            self.continue_btn.draw()
            self.continue_text.draw()

            if self.mouse.isPressedIn(self.continue_btn) and response_text:
                break

            self.win.flip()

        # Score response
        correct_backward = ''.join(str(d) for d in reversed(digits))
        score = sum(1 for i, c in enumerate(response_text)
                    if i < len(correct_backward) and c == correct_backward[i])

        self.data['working_memory'] = {
            'sequence': digits,
            'correct_answer': correct_backward,
            'response': response_text,
            'score': score,
            'max_score': len(digits),
        }

    # -------------------------------------------------------------------------
    # PHASE 8: ATTENTION CHECKS
    # -------------------------------------------------------------------------

    def run_attention_checks(self):
        """Run attention check questions."""
        checks = {}

        # Question 1: Number of cards
        options_n_cards = ['10 cards', '15 cards', '20 cards', '25 cards']
        checks['n_cards'] = self._ask_multiple_choice(
            'How many total cards did you see in the memory task?',
            options_n_cards
        )
        checks['n_cards_correct'] = (checks['n_cards'] == '20 cards')

        # Question 2: Card types
        options_types = ['Red and Black', 'Hearts and Spades', 'Ace and Blank', 'King and Queen']
        checks['card_types'] = self._ask_multiple_choice(
            'What were the two types of cards?',
            options_types
        )
        checks['card_types_correct'] = (checks['card_types'] == 'Ace and Blank')

        # Question 3: Betting outcome
        options_bet = ['Lost points', 'Gained points', 'Stayed the same', 'There was no betting game']
        checks['betting_outcome'] = self._ask_multiple_choice(
            'In the betting game, what happened when you bet correctly?',
            options_bet
        )
        checks['betting_correct'] = (checks['betting_outcome'] == 'Gained points')

        self.data['attention_checks'] = checks

    def _ask_multiple_choice(self, question: str, options: List[str]) -> str:
        """Helper to display multiple choice question."""
        choice = None
        buttons = []

        for i, option in enumerate(options):
            y_pos = 0.1 - (i * 0.1)

            btn = visual.Rect(
                self.win,
                width=0.5,
                height=0.08,
                pos=(0, y_pos),
                fillColor='#34495e',
                lineColor='white',
            )

            text = visual.TextStim(
                self.win,
                text=option,
                height=0.025,
                pos=(0, y_pos),
                color='white',
            )

            buttons.append((btn, text, option))

        question_stim = visual.TextStim(
            self.win,
            text=question,
            height=0.035,
            pos=(0, 0.3),
            color=CONFIG.colors['text'],
            wrapWidth=0.8,
        )

        while choice is None:
            question_stim.draw()

            for btn, text, value in buttons:
                btn.draw()
                text.draw()

                if self.mouse.isPressedIn(btn):
                    choice = value
                    while self.mouse.isPressedIn(btn):
                        self.win.flip()
                    break

            self.win.flip()

            if event.getKeys(['escape']):
                self.quit_experiment()

        return choice

    # -------------------------------------------------------------------------
    # DEBRIEF AND DATA SAVING
    # -------------------------------------------------------------------------

    def show_debrief(self):
        """Display debrief information."""
        completion_code = self._generate_completion_code()

        self.show_instructions(
            title='STUDY COMPLETE!',
            text=f"""Thank you for participating!

ABOUT THIS STUDY:
We tested whether learning card sequences creates expectations.

You saw a {"patterned (BLANK-ACE-BLANK-ACE)" if self.condition == "NR_PATTERN" else "random"} sequence.

According to Capaldi's Sequential Theory (1967), learning patterns
like "BLANK → ACE" creates expectations that persist even when
the pattern changes.

Your data helps us test this theory!

Your completion code: {completion_code}""",
        )

        self.data['completion_code'] = completion_code

    def _generate_completion_code(self) -> str:
        """Generate unique completion code."""
        import hashlib
        data_str = f"{self.participant_info['participant_id']}{datetime.now().isoformat()}"
        return hashlib.md5(data_str.encode()).hexdigest()[:8].upper()

    def save_data(self, output_dir: str = "data/"):
        """Save all data to JSON file."""
        self.data['end_time'] = datetime.now().isoformat()

        # Create output directory
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        filename = os.path.join(
            output_dir,
            f"pattern_memory_{self.participant_info['participant_id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )

        with open(filename, 'w') as f:
            json.dump(self.data, f, indent=2)

        print(f"Data saved to: {filename}")
        return filename

    def quit_experiment(self):
        """Save data and quit."""
        self.save_data()
        self.win.close()
        core.quit()

    # -------------------------------------------------------------------------
    # MAIN RUN METHOD
    # -------------------------------------------------------------------------

    def run(self):
        """Run the complete experiment."""
        try:
            # Phase 1: Encoding
            self.run_encoding_phase()

            # Phase 2: Distractor
            self.run_distractor_task()

            # Phase 3: Memory test
            self.run_memory_test()

            # Phase 4: Expectation (PRIMARY DV)
            self.run_expectation_test()

            # Phase 5: Betting game
            self.run_betting_game()

            # Phase 6: Mechanism questions
            self.run_mechanism_questions()

            # Phase 7: Working memory
            self.run_working_memory_test()

            # Phase 8: Attention checks
            self.run_attention_checks()

            # Debrief
            self.show_debrief()

            # Save and close
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

def get_participant_info() -> Dict:
    """Display dialog to collect participant information."""
    info = {
        'participant_id': '',
        'age': '',
        'gender': ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
        'condition': CONDITIONS,
    }

    dlg = gui.DlgFromDict(
        dictionary=info,
        title='Pattern Memory Study',
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
    Main entry point for Experiment 3.

    Usage:
        python pattern_memory.py
    """
    print("=" * 70)
    print("EXPERIMENT 3: PATTERN MEMORY CHALLENGE")
    print("=" * 70)

    # Get participant info
    participant_info = get_participant_info()

    # Run experiment
    experiment = PatternMemoryExperiment(participant_info)
    experiment.run()

    print("Experiment completed successfully!")
