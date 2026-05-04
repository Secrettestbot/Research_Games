# Experiment Design Reference Document

## Source
Original chat transcript from Claude conversation about designing undergraduate-friendly experiments
to test Festinger's Cognitive Dissonance Theory vs. Capaldi's Sequential Theory.

## Overview

This document contains the complete design specifications for three experiments:

1. **Experiment 1: The Digital Treasure Hunt**
   - Format: Online behavioral task (PsychoPy/Pavlovia)
   - Time: 12-15 minutes
   - Sample: 320 students (80 per condition)
   - Tests: Effort justification vs. sequential pattern learning

2. **Experiment 2: The Career Choice Study**
   - Format: Online within-subjects survey (Qualtrics)
   - Time: 12 minutes
   - Sample: 240 students
   - Tests: Job recognition patterns and tenure intentions

3. **Experiment 3: The Pattern Memory Challenge**
   - Format: Online memory + expectation task (PsychoPy/Pavlovia)
   - Time: 10 minutes
   - Sample: 240 students (120 per condition)
   - Tests: N→R sequence learning and expectation formation

## Theoretical Framework

### Festinger's Cognitive Dissonance Theory (1957)
- Core idea: "If I work hard for something, it must be valuable"
- Prediction: High effort → Higher perceived value → More persistence

### Capaldi's Sequential Theory (1967)
- Core idea: "If I learn that rewards follow non-rewards, I expect that pattern"
- Prediction: N→R pattern → Stronger expectations → More persistence

## Key Revisions Applied to All Experiments
- Eliminated confounds (matched total rewards, frequencies)
- Improved effort manipulation (actual work, not just waiting)
- Better DVs (removed ceiling effects, added behavioral measures)
- Stronger attention checks (comprehension, not just memory)
- Clearer predictions (specified contrasts, effect sizes)
- Added pilot requirements (mandatory testing before main study)

---

## Critical Statistical Contrasts

### The Definitive Tests

| Contrast | Festinger Predicts | Capaldi Predicts |
|----------|-------------------|------------------|
| HIGH EFFORT vs. BASELINE | Should differ (p < .05) | Should NOT differ |
| N→R vs. BASELINE | Should NOT differ | Should differ (p < .05) |
| HIGH EFFORT vs. N→R | HIGH EFFORT ≥ N→R | N→R > HIGH EFFORT |

---

## Directory Structure

See the top-level `README.md` for the authoritative repo layout. At a glance:

```
experiments/
  experiment1_treasure_hunt/   # PsychoPy script + condition CSVs + R analysis
  experiment2_career_choice/   # Qualtrics-bound Python config + R analysis
  experiment3_pattern_memory/  # PsychoPy script + condition CSVs + R analysis

docs/                          # Design references (this file)
shared/                        # Cross-experiment R analysis helpers
web/                           # jsPsych port of Experiment 1 + Express server
```

---

For full experiment specifications, see the implementation files in each experiment directory.
