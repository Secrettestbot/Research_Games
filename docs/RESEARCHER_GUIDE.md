# Researcher's Guide - Research Games Website

## Overview

This platform hosts three psychological experiments testing **Festinger's Cognitive Dissonance Theory** vs. **Capaldi's Sequential Theory** of behavioral persistence.

## The Three Experiments

### Experiment 1: Digital Treasure Hunt
**Duration**: 12-15 minutes
**Sample**: 320 participants (80 per condition)
**Design**: Between-subjects, 4 conditions

**Conditions**:
- `BASELINE`: Random sequence, 3 clicks per chest
- `HIGH_EFFORT`: Random sequence, 10 clicks for coins (tests Festinger)
- `NR_PATTERN`: Alternating empty→coin sequence (tests Capaldi)
- `RN_PATTERN`: Coin→empty sequence (control)

**Primary DV**: `extinction_chests_opened` (0-30)

**Theoretical Predictions**:
| Theory | HIGH_EFFORT vs BASELINE | NR_PATTERN vs BASELINE |
|--------|-------------------------|------------------------|
| Festinger | p < .05, d > 0 | p > .10 (equivalent) |
| Capaldi | p > .10 (equivalent) | p < .05, d > 0 |

---

### Experiment 2: Career Choice Study
**Duration**: 12 minutes
**Sample**: 240 participants
**Design**: Within-subjects (all see all 3 scenarios)

**Scenarios**:
- Company A (TechFlow): `CONSISTENT` - Monthly spotlight every month
- Company B (InnovateX): `EARNED` - Spotlight requires 4 hours work (tests Festinger)
- Company C (BuildCorp): `PATTERNED` - Alternating quiet→spotlight (tests Capaldi)

**Primary DVs**:
1. `tenure_intention_months` (0-24) - How long they'd stay after program ends
2. `recognition_value_rating` (0-100) - Perceived value of recognition

**Theoretical Predictions**:
| Theory | Tenure Rankings |
|--------|----------------|
| Festinger | EARNED > CONSISTENT ≥ PATTERNED |
| Capaldi | PATTERNED > CONSISTENT ≥ EARNED |

---

### Experiment 3: Pattern Memory Challenge
**Duration**: 10 minutes
**Sample**: 240 participants (120 per condition)
**Design**: Between-subjects, 2 conditions

**Conditions**:
- `NR_PATTERN`: BLANK→ACE→BLANK→ACE alternating sequence
- `RANDOM`: Random sequence (same cards, random order)

**Primary DVs**:
1. `expectation_rating` (1-7) - "After BLANK, what comes next?" (1=Definitely BLANK, 7=Definitely ACE)
2. `pct_bet_ace_after_blank` (0.0-1.0) - % of times betting on ACE after seeing BLANK

**Theoretical Predictions**:
| Theory | NR_PATTERN vs RANDOM |
|--------|---------------------|
| Festinger | No prediction (not effort-based) |
| Capaldi | Higher expectation & betting in NR_PATTERN |

---

## Running the Study

### 1. Participant Recruitment

**Eligibility Criteria**:
- Age 18+
- University students (any major)
- Normal or corrected-to-normal vision
- Not participated in similar studies

**Recruitment Materials**:
```
Study Title: "Decision Making and Pattern Recognition"
Duration: 10-15 minutes
Compensation: Course credit or $2
```

### 2. Participant Flow

1. **Landing Page** → Experiment information
2. **Consent Form** → Electronic consent (required)
3. **Random Assignment** → Balanced across conditions
4. **Experiment** → One of three experiments
5. **Debrief** → Full disclosure + completion code
6. **Data Save** → Automatic to database

### 3. Monitoring Data Collection

**Check Progress**:
```bash
# Via browser
http://localhost/api/stats/treasure_hunt
http://localhost/api/stats/career_choice
http://localhost/api/stats/pattern_memory

# Via command line
curl http://localhost/api/stats/treasure_hunt | jq
```

**Sample Output**:
```json
{
  "experiment": "treasure_hunt",
  "conditions": {
    "BASELINE": {"count": 45, "target": 80, "progress": "56%"},
    "HIGH_EFFORT": {"count": 42, "target": 80, "progress": "53%"},
    "NR_PATTERN": {"count": 48, "target": 80, "progress": "60%"},
    "RN_PATTERN": {"count": 45, "target": 80, "progress": "56%"}
  },
  "total": 180,
  "target_total": 320,
  "overall_progress": "56%"
}
```

---

## Data Management

### Exporting Data

**Method 1: API Export (Recommended)**
```bash
# CSV format (R-ready)
curl http://localhost/api/export/treasure_hunt/csv > experiment1.csv
curl http://localhost/api/export/career_choice/csv > experiment2.csv
curl http://localhost/api/export/pattern_memory/csv > experiment3.csv

# JSON format (full data)
curl http://localhost/api/export/treasure_hunt/json > experiment1.json
```

**Method 2: Database Direct Export**
```bash
# Using Adminer (GUI)
Open http://localhost:8080
Login: postgres / research_admin / [password]
Select table → Export → CSV

# Using command line
docker-compose exec postgres psql -U research_admin research_games \
  -c "\copy experiment1_treasure TO '/tmp/exp1.csv' CSV HEADER"
```

### CSV Format (for R Analysis)

**Experiment 1**:
```csv
participant_id,condition,total_coins,extinction_chests_opened,start_time,end_time,excluded,exclusion_reason
TH_123,HIGH_EFFORT,45,12,2026-01-27T18:00:00Z,2026-01-27T18:15:00Z,false,
```

**Experiment 2**:
```csv
participant_id,tenure_A,tenure_B,tenure_C,value_A,value_B,value_C,excluded
CC_456,18,22,20,75,85,80,false
```

**Experiment 3**:
```csv
participant_id,condition,expectation_rating,pct_bet_ace_after_blank,pattern_detected,excluded
PM_789,NR_PATTERN,6,0.80,true,false
```

---

## Data Analysis

### Loading Data in R

```r
library(tidyverse)

# Load experiment data
exp1 <- read_csv("experiment1.csv")
exp2 <- read_csv("experiment2.csv")
exp3 <- read_csv("experiment3.csv")

# Apply exclusion criteria
exp1_clean <- exp1 %>% filter(excluded == FALSE)
exp2_clean <- exp2 %>% filter(excluded == FALSE)
exp3_clean <- exp3 %>% filter(excluded == FALSE)
```

### Primary Statistical Tests

**Experiment 1 - Critical Contrasts**:
```r
library(afex)
library(emmeans)

# ANOVA
model1 <- aov_ez("participant_id", "extinction_chests_opened", exp1_clean,
                  between = "condition")

# Planned contrasts
emm <- emmeans(model1, "condition")

# Festinger's prediction: HIGH_EFFORT > BASELINE
contrast(emm, list("Effort_Effect" = c(-1, 1, 0, 0)))  # BASELINE vs HIGH_EFFORT

# Capaldi's prediction: NR_PATTERN > BASELINE
contrast(emm, list("Pattern_Effect" = c(-1, 0, 1, 0)))  # BASELINE vs NR_PATTERN

# Critical test: HIGH_EFFORT vs NR_PATTERN
contrast(emm, list("Critical" = c(0, 1, -1, 0)))
```

**Experiment 2 - Within-Subjects ANOVA**:
```r
# Reshape to long format
exp2_long <- exp2_clean %>%
  pivot_longer(cols = c(tenure_A, tenure_B, tenure_C),
               names_to = "scenario", values_to = "tenure")

# Within-subjects ANOVA
model2 <- aov_ez("participant_id", "tenure", exp2_long,
                  within = "scenario")

# Pairwise comparisons
emm2 <- emmeans(model2, "scenario")
pairs(emm2)
```

**Experiment 3 - Independent Samples t-test**:
```r
# Expectation rating
t.test(expectation_rating ~ condition, data = exp3_clean)

# Betting behavior
t.test(pct_bet_ace_after_blank ~ condition, data = exp3_clean)
```

---

## Exclusion Criteria

### Automatic Exclusions

The system automatically flags participants for exclusion:

1. **Duration-based**:
   - Too fast: < 5 minutes (not engaged)
   - Too slow: > 30 minutes (likely interrupted)

2. **Attention checks**:
   - **Exp1**: "How many coins did you find in Phase 2?" (correct: 0)
   - **Exp2**: "Which company required work for recognition?" (correct: B)
   - **Exp3**: "How many cards did you see?" (correct: 20)

3. **Straight-lining**:
   - All Likert responses identical
   - No variation in betting behavior

### Manual Review

After export, review flagged participants:
```r
# Check flagged participants
exp1 %>% filter(excluded == TRUE) %>%
  count(exclusion_reason)

# Decide whether to retain or exclude
# Document decisions in preregistration
```

---

## IRB Considerations

### Mild Deception

**Experiment 1 Only** uses mild deception:
- Phase 2 (extinction): All chests are empty, but participants aren't told in advance
- **Justification**: Testing persistence requires participants not knowing rewards have stopped
- **Debriefing**: Full disclosure immediately after, with explanation of scientific rationale

**Other Experiments**: No deception

### Consent Form

Required elements:
- Study purpose (pattern recognition and decision-making)
- Duration and compensation
- Voluntary participation and right to withdraw
- Data confidentiality and anonymization
- Contact information for questions
- IRB approval number

### Debriefing

All participants receive:
1. True purpose of study (testing Festinger vs Capaldi theories)
2. Explanation of any deception (Exp1 only)
3. Why the research matters
4. Opportunity to withdraw data
5. Completion code for compensation

---

## Troubleshooting

### Common Issues

**Participant can't proceed**:
- Check browser compatibility (Firefox recommended)
- Check internet connection
- Check if consent was given

**Data not saving**:
- Check API health: `curl http://localhost/api/health`
- Check database connection
- Review logs: `docker-compose logs api`

**Unbalanced condition assignment**:
- System should auto-balance
- Check `condition_counts` table in database
- Verify randomization algorithm

### Support

For technical issues:
- Check logs: `docker-compose logs -f`
- Review API: http://localhost/api/health
- Database admin: http://localhost:8080

For research questions:
- Review original papers: Festinger (1957), Capaldi (1967)
- Consult experiment design reference: `docs/experiment_design_reference.md`

---

## Publication Checklist

Before publishing results:

- [ ] All data collected (N reached for all conditions)
- [ ] Exclusion criteria applied consistently
- [ ] Preregistered analyses completed
- [ ] Assumptions checked (normality, homogeneity)
- [ ] Effect sizes reported (Cohen's d)
- [ ] Bayesian analyses conducted (evidence for H0)
- [ ] Raw data archived (OSF, Dataverse)
- [ ] Materials shared (experiment code available)
- [ ] Preregistration linked
- [ ] Any deviations from preregistration noted

---

## Contact

For questions about:
- **Technical issues**: Check DEPLOYMENT_GUIDE.md
- **Research design**: See experiment_design_reference.md in `/tmp/research_games/docs/`
- **Data analysis**: See R analysis scripts in original repository
