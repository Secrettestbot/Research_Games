# Research Games: Testing Festinger vs. Capaldi

Three undergraduate-friendly experiments comparing Festinger's Cognitive Dissonance Theory (1957) vs. Capaldi's Sequential Theory (1967) of behavioral persistence.

## Overview

This project implements three experiments designed to answer a fundamental question in behavioral psychology:

**What makes people persist after rewards stop?**

- **Festinger's Theory**: Working hard for rewards increases their perceived value, leading to persistence
- **Capaldi's Theory**: Learning that nonrewards predict rewards (N→R pattern) creates expectations that drive persistence

## Experiments

### Experiment 1: The Digital Treasure Hunt
**Format**: Online behavioral task (PsychoPy/Pavlovia)
**Time**: 12-15 minutes
**Sample**: 320 students (80 per condition)

Participants click treasure chests to collect gold coins. The key manipulation is the pattern of rewards and the effort required:

| Condition | Pattern | Effort | Theory Tested |
|-----------|---------|--------|---------------|
| BASELINE | Random | Low (3 clicks) | Control |
| HIGH_EFFORT | Random | High (10 clicks for coins) | Festinger |
| NR_PATTERN | Empty→Coin alternating | Low | Capaldi |
| RN_PATTERN | Coin→Empty alternating | Low | Capaldi control |

**Primary DV**: Number of chests opened in extinction (when all chests are empty)

### Experiment 2: The Career Choice Study
**Format**: Online within-subjects survey (Qualtrics)
**Time**: 12 minutes
**Sample**: 240 students

Participants evaluate three hypothetical job offers with different employee recognition programs:

| Company | Recognition Type | Description |
|---------|-----------------|-------------|
| A (TechFlow) | CONSISTENT | Monthly spotlight, no work required |
| B (InnovateX) | EARNED | Monthly spotlight, requires 4 hours of portfolio work |
| C (BuildCorp) | PATTERNED | Alternating: quiet month → spotlight month |

**Primary DV**: Tenure intention after recognition program ends (months)

### Experiment 3: The Pattern Memory Challenge
**Format**: Online memory + expectation task (PsychoPy/Pavlovia)
**Time**: 10 minutes
**Sample**: 240 students (120 per condition)

Participants watch a sequence of cards (ACE or BLANK), then report their expectations:

| Condition | Sequence | Pattern |
|-----------|----------|---------|
| NR_PATTERN | BLANK→ACE→BLANK→ACE... | Perfect alternation |
| RANDOM | Shuffled | No systematic pattern |

**Primary DVs**:
1. Expectation rating (1-7): "After BLANK, what comes next?"
2. Betting behavior: % bet on ACE after seeing BLANK

## Theoretical Predictions

### Festinger (Cognitive Dissonance)
- HIGH_EFFORT > BASELINE (effort creates value)
- Pattern conditions = BASELINE (sequence doesn't matter)
- Mechanism: Effort → Perceived value → Persistence

### Capaldi (Sequential Theory)
- NR_PATTERN > BASELINE > RN_PATTERN (N→R learning creates expectation)
- HIGH_EFFORT = BASELINE (effort doesn't matter when sequence is random)
- Mechanism: N→R association → Expectation → Persistence

## Project Structure

```
Research_Games/
├── README.md
├── docs/
│   └── experiment_design_reference.md
├── experiments/
│   ├── experiment1_treasure_hunt/
│   │   ├── treasure_hunt.py          # Main PsychoPy experiment
│   │   ├── conditions/               # CSV condition files
│   │   │   ├── baseline.csv
│   │   │   ├── high_effort.csv
│   │   │   ├── nr_pattern.csv
│   │   │   └── rn_pattern.csv
│   │   ├── analysis/
│   │   │   └── analysis.R            # R analysis script
│   │   └── assets/                   # Images, sounds
│   │
│   ├── experiment2_career_choice/
│   │   ├── career_survey.py          # Survey implementation
│   │   └── analysis/
│   │       └── analysis.R
│   │
│   └── experiment3_pattern_memory/
│       ├── pattern_memory.py         # Main PsychoPy experiment
│       ├── conditions/
│       │   ├── nr_pattern.csv
│       │   └── random.csv
│       └── analysis/
│           └── analysis.R
│
└── shared/
    └── common_analysis_functions.R   # Shared R functions
```

## Requirements

### Python (for PsychoPy experiments)
```
psychopy >= 2023.1.0
numpy
```

### R (for analysis)
```r
tidyverse
afex
emmeans
effsize
TOSTER
BayesFactor
lavaan
pwr
patchwork
jsonlite
```

## Running the Experiments

### Experiment 1: Treasure Hunt
```bash
cd experiments/experiment1_treasure_hunt
python treasure_hunt.py
```

### Experiment 2: Career Choice
The survey can be implemented in:
- Qualtrics (recommended)
- Custom web application
- PsychoPy forms

See `career_survey.py` for the complete survey structure.

### Experiment 3: Pattern Memory
```bash
cd experiments/experiment3_pattern_memory
python pattern_memory.py
```

## Data Analysis

Each experiment has a dedicated R analysis script with:
- Data loading and preprocessing
- Exclusion criteria (preregistered)
- Descriptive statistics
- Primary hypothesis tests (ANOVA, t-tests)
- Planned contrasts
- Equivalence testing (for null predictions)
- Bayesian analysis
- Mediation analysis
- Visualizations

### Running Analysis
```r
# Example for Experiment 1
source("experiments/experiment1_treasure_hunt/analysis/analysis.R")
results <- run_full_analysis("data/")
```

## Key Statistical Tests

### Critical Contrasts (Preregistered)

1. **Effort Effect**: HIGH_EFFORT vs. BASELINE
   - Festinger predicts: p < .05, d > 0
   - Capaldi predicts: p > .10 (equivalent)

2. **Pattern Effect**: NR_PATTERN vs. BASELINE
   - Festinger predicts: p > .10 (equivalent)
   - Capaldi predicts: p < .05, d > 0

3. **Critical Test**: HIGH_EFFORT vs. NR_PATTERN
   - Festinger predicts: HIGH_EFFORT ≥ NR_PATTERN
   - Capaldi predicts: NR_PATTERN > HIGH_EFFORT

## Pilot Testing

Before main data collection, run pilots to verify:
- Manipulation checks are working
- Expected effect sizes
- Timing is accurate
- No technical issues

See individual experiment files for pilot checklists.

## IRB Considerations

- Experiment 1 involves mild deception (extinction phase)
- Full debriefing provided after each study
- Participants can withdraw data within 7 days
- All data anonymized

## References

- Capaldi, E. J. (1967). A sequential hypothesis of instrumental learning. In K.W. Spence & J.T. Spence (Eds.), *The psychology of learning and motivation* (Vol. 1, pp. 67-156).

- Festinger, L. (1957). *A Theory of Cognitive Dissonance*. Stanford University Press.

- Festinger, L., & Carlsmith, J. M. (1959). Cognitive consequences of forced compliance. *Journal of Abnormal and Social Psychology*, 58(2), 203-210.

## License

This project is for educational and research purposes.

## Contact

For questions about the experiments or analysis, please open an issue in this repository.
