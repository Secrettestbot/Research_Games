# Research Games Website

A full-stack web application for conducting three psychological experiments testing Festinger's Cognitive Dissonance Theory vs. Capaldi's Sequential Theory.

## Project Structure

```
research-games-website/
├── src/
│   ├── frontend/           # Frontend application (T1 Terminal)
│   │   ├── public/         # Static HTML pages
│   │   ├── experiments/    # jsPsych experiment implementations
│   │   └── assets/         # CSS, images, fonts
│   ├── backend/            # Backend API (T2 Terminal)
│   │   ├── routes/         # Express route handlers
│   │   ├── models/         # Database models (Sequelize)
│   │   ├── middleware/     # Auth, validation, logging
│   │   └── utils/          # Helper functions
│   └── docker/             # Docker configuration (T3 Terminal)
│       ├── nginx/          # Nginx configs
│       ├── postgres/       # DB init scripts
│       └── scripts/        # Setup/deployment scripts
├── data/                   # Persistent data storage
├── docs/                   # Documentation
└── docker-compose.yml      # Container orchestration
```

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript, jsPsych 7.x
- **Backend**: Node.js 18, Express.js, PostgreSQL 15
- **Deployment**: Docker, Docker Compose, Nginx
- **Optimization**: Firefox-optimized CSS and testing

## Experiments

1. **Experiment 1: Digital Treasure Hunt** (12-15 min)
   - Clicking game testing effort vs pattern effects
   - 4 conditions: BASELINE, HIGH_EFFORT, NR_PATTERN, RN_PATTERN
   - Primary DV: Chests opened in extinction phase

2. **Experiment 2: Career Choice Study** (12 min)
   - Within-subjects survey comparing job recognition programs
   - 3 conditions: CONSISTENT, EARNED, PATTERNED
   - Primary DVs: Tenure intention, recognition value

3. **Experiment 3: Pattern Memory Challenge** (10 min)
   - Card sequence memory and betting task
   - 2 conditions: NR_PATTERN, RANDOM
   - Primary DVs: Expectation rating, betting behavior

## Quick Start

```bash
# Clone and setup
git clone <repo-url>
cd research-games-website

# Start with Docker
docker-compose up -d

# Access application
open http://localhost:3000
```

## Development Team

- **Overlord**: Architecture, coordination, integration
- **T1**: Frontend development
- **T2**: Backend API development
- **T3**: Docker infrastructure

## Data Export

The system exports data in two formats:
- **JSON**: Raw data for archival
- **CSV**: Formatted for R analysis (tidyverse-compatible)

## License

Research use only.
