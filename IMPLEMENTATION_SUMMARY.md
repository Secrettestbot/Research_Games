# Research Games Website - Implementation Summary

## ✅ Project Complete

All three psychological experiments have been successfully implemented and deployed!

---

## 🎮 Experiments Implemented

### 1. **Experiment 1: Digital Treasure Hunt** ⚔️
- **File**: `src/frontend/public/experiment1.html`
- **Script**: `src/frontend/experiments/experiment1-treasure.js`
- **Type**: Between-subjects (4 conditions: BASELINE, HIGH_EFFORT, NR_PATTERN, RN_PATTERN)
- **Duration**: 12-15 minutes
- **Primary DV**: `extinction_chests_opened` - Number of chests opened after rewards stop
- **Features**:
  - Custom ChestClickPlugin for interactive clicking mechanic
  - Three phases: Practice (5 trials) → Acquisition (20 trials) → Extinction (up to 30 trials)
  - Real-time coin tracking and progress bars
  - Condition-based click requirements and reward sequences

### 2. **Experiment 2: Career Choice Study** 💼
- **File**: `src/frontend/public/experiment2.html`
- **Script**: `src/frontend/experiments/experiment2-career.js`
- **Type**: Within-subjects (all participants see all 3 scenarios)
- **Duration**: ~12 minutes
- **Primary DVs**:
  - `tenure_A/B/C` (0-24 months) - How long would you stay?
  - `value_A/B/C` (0-100) - How much do you value the company?
- **Features**:
  - Three company scenarios (CONSISTENT, EARNED, PATTERNED payment histories)
  - Randomized scenario presentation order
  - Working memory test (digit span)
  - Manipulation checks for predictability and effort
  - Demographics survey

### 3. **Experiment 3: Pattern Memory Challenge** 🎴
- **File**: `src/frontend/public/experiment3.html`
- **Script**: `src/frontend/experiments/experiment3-pattern.js`
- **Type**: Between-subjects (2 conditions: BLANK_FIRST, ACE_FIRST)
- **Duration**: ~10 minutes
- **Primary DVs**:
  - `expectation_rating` (0-10) - Expected number of Aces in next 10 cards
  - `pct_bet_ace_after_blank` (0-100) - Percentage willing to bet on Ace after Blank
- **Features**:
  - Custom CardFlipPlugin for interactive card flipping
  - Alternating pattern learning (Ace/Blank cards)
  - Three phases: Practice (4 trials) → Acquisition (20 trials) → Extinction (10 trials, all blank)
  - Working memory test (digit span)
  - Pattern recognition questions

---

## 🏗️ Infrastructure

### Docker Services (All Running ✓)
```
✓ nginx         - Port 80/443  (HEALTHY)
✓ postgres      - Port 5432    (HEALTHY)
✓ api           - Port 3001    (running)
✓ adminer       - Port 8080    (running)
```

### Backend API (Node.js + Express + PostgreSQL)
- **7 Endpoints**:
  - `POST /api/consent` - Record consent and create participant
  - `GET /api/assign/:experiment` - Balanced condition assignment
  - `POST /api/experiment/:id/save` - Save experiment data
  - `GET /api/stats/:experiment` - Collection statistics
  - `GET /api/export/:experiment/:format` - CSV/JSON export
  - `GET /api/health` - Health check
  - `POST /api/admin/login` - JWT authentication

### Database Schema
- **5 Tables**: participants, experiment1_treasure, experiment2_career, experiment3_pattern, admin_users
- **3 Export Views**: exp1_export, exp2_export, exp3_export (for R analysis)
- **Stored Function**: `get_next_condition()` for balanced randomization

### Frontend
- **Landing Page**: `src/frontend/public/index.html` with IRB consent form
- **Debrief Page**: `src/frontend/public/debrief.html` with completion codes
- **jsPsych 7.3.4**: Loaded from CDN (unpkg.com)
- **Firefox Optimized**: Custom CSS with Firefox-specific optimizations

---

## 🚀 Accessing the Application

### Main Website
```
http://localhost/
```
Navigate here to:
1. Read consent form
2. Get randomly assigned to an experiment
3. Complete the assigned experiment
4. View debriefing information

### Database Admin (Adminer)
```
http://localhost:8080/
```
Credentials:
- System: PostgreSQL
- Server: postgres
- Username: research_admin
- Password: change_me_in_production
- Database: research_games

### Individual Experiments (Direct Access)
```
http://localhost/experiment1.html   # Treasure Hunt
http://localhost/experiment2.html   # Career Choice
http://localhost/experiment3.html   # Pattern Memory
```
**Note**: Direct access requires valid session data. Use main landing page for proper flow.

---

## 📊 Data Collection

### How Data is Saved
1. Participant completes experiment
2. JavaScript calls `api.saveExperimentData(experimentId, data)`
3. API validates data and saves to PostgreSQL
4. Completion code generated and stored in sessionStorage
5. User redirected to debrief page

### Exporting Data for Analysis
```bash
# CSV export (ready for R/SPSS)
curl http://localhost/api/export/1/csv > exp1_data.csv
curl http://localhost/api/export/2/csv > exp2_data.csv
curl http://localhost/api/export/3/csv > exp3_data.csv

# JSON export
curl http://localhost/api/export/1/json > exp1_data.json
```

### R Analysis
Use the export views which provide clean, analysis-ready data:
- `exp1_export` - Treasure Hunt data
- `exp2_export` - Career Choice data (long format for within-subjects)
- `exp3_export` - Pattern Memory data

---

## 📁 Project Structure

```
research-games-website/
├── docker-compose.yml              # Orchestrates all services
├── src/
│   ├── docker/
│   │   ├── backend/Dockerfile      # Node.js API container
│   │   ├── nginx/Dockerfile        # Nginx web server container
│   │   ├── nginx/nginx.conf        # Nginx configuration
│   │   └── postgres/init.sql       # Database schema
│   ├── backend/
│   │   ├── package.json            # Node.js dependencies
│   │   └── src/
│   │       ├── server.js           # Express application
│   │       ├── models/index.js     # Sequelize ORM models
│   │       ├── routes/api.js       # API endpoints
│   │       └── middleware/         # Validation & auth
│   └── frontend/
│       ├── public/
│       │   ├── index.html          # Landing page
│       │   ├── experiment1.html    # Treasure Hunt
│       │   ├── experiment2.html    # Career Choice
│       │   ├── experiment3.html    # Pattern Memory
│       │   └── debrief.html        # Thank you page
│       ├── experiments/
│       │   ├── experiment1-treasure.js   # Treasure Hunt logic
│       │   ├── experiment2-career.js     # Career Choice logic
│       │   └── experiment3-pattern.js    # Pattern Memory logic
│       └── assets/
│           ├── css/styles.css      # Global styles (Firefox optimized)
│           └── js/api-client.js    # API wrapper
├── docs/                           # Documentation
│   ├── API_CONTRACT.md
│   ├── DEPLOYMENT_GUIDE.md
│   └── RESEARCHER_GUIDE.md
└── data/                           # Persistent data volume
```

---

## 🧪 Testing Experiments

### Test Flow
1. **Start Docker**: `docker compose up -d`
2. **Open Browser**: Navigate to `http://localhost/`
3. **Accept Consent**: Click "I Agree" on consent form
4. **Complete Experiment**: You'll be randomly assigned to one of three experiments
5. **View Debrief**: See completion code and study information
6. **Check Database**: View data in Adminer at `http://localhost:8080/`

### Quick Test Script
```bash
# Check all services are running
docker compose ps

# View API logs
docker compose logs -f api

# View Nginx logs
docker compose logs -f nginx

# Test API health
curl http://localhost/api/health
```

---

## 🔬 Research Design Features

### Theory Testing
Both theories are tested across all experiments:
1. **Festinger's Cognitive Dissonance Theory (1957)**
   - Higher effort → Greater value → More persistence
   - Tested via HIGH_EFFORT condition (Exp1), EARNED scenario (Exp2)

2. **Capaldi's Sequential Theory (1967)**
   - Pattern learning → Stronger expectations → More persistence
   - Tested via NR_PATTERN/RN_PATTERN (Exp1), PATTERNED scenario (Exp2), alternating patterns (Exp3)

### IRB Compliance
- ✅ Informed consent form
- ✅ Deception disclosure (Experiment 1)
- ✅ Withdrawal rights explained
- ✅ Contact information provided
- ✅ Completion codes for compensation
- ✅ Data anonymization

### Balanced Randomization
The `get_next_condition()` PostgreSQL function ensures equal distribution:
- Counts participants per condition
- Assigns to least-populated condition
- Prevents imbalanced groups

---

## 🎯 Next Steps

### For Researchers:
1. Review and test each experiment thoroughly
2. Update IRB information in `debrief.html` (lines 69-79)
3. Configure production environment variables in `.env`
4. Set up SSL certificates for HTTPS (see `DEPLOYMENT_GUIDE.md`)
5. Run pilot studies to validate timing and DVs
6. Begin data collection!

### For Developers:
1. All core functionality is implemented ✓
2. Consider adding:
   - Admin dashboard for real-time monitoring
   - Data visualization tools
   - Automated backups
   - Email notifications for completion codes
   - A/B testing framework

---

## 📝 Key Files Modified/Created

### Docker & Infrastructure (7 files)
- `docker-compose.yml`
- `src/docker/backend/Dockerfile`
- `src/docker/nginx/Dockerfile`
- `src/docker/nginx/nginx.conf`
- `src/docker/postgres/init.sql`
- `.env.example`
- `.dockerignore`

### Backend API (6 files)
- `src/backend/package.json`
- `src/backend/src/server.js`
- `src/backend/src/models/index.js`
- `src/backend/src/routes/api.js`
- `src/backend/src/middleware/validation.js`
- `src/backend/src/middleware/auth.js`

### Frontend (11 files)
- `src/frontend/public/index.html`
- `src/frontend/public/experiment1.html`
- `src/frontend/public/experiment2.html`
- `src/frontend/public/experiment3.html`
- `src/frontend/public/debrief.html`
- `src/frontend/experiments/experiment1-treasure.js`
- `src/frontend/experiments/experiment2-career.js`
- `src/frontend/experiments/experiment3-pattern.js`
- `src/frontend/assets/css/styles.css`
- `src/frontend/assets/js/api-client.js`

### Documentation (5 files)
- `README.md`
- `docs/API_CONTRACT.md`
- `docs/DEPLOYMENT_GUIDE.md`
- `docs/RESEARCHER_GUIDE.md`
- `STATUS.md`

**Total: 29 core files created/modified**

---

## ✨ Features Implemented

- ✅ Three complete jsPsych experiments
- ✅ Docker multi-container deployment
- ✅ PostgreSQL database with proper schema
- ✅ RESTful API with validation
- ✅ Balanced randomization
- ✅ Working memory measures (digit span)
- ✅ Manipulation checks
- ✅ IRB-compliant consent and debriefing
- ✅ Completion code generation
- ✅ Data export (CSV/JSON)
- ✅ Firefox optimization
- ✅ Responsive design
- ✅ Error handling and fallbacks
- ✅ Health checks for all services
- ✅ Comprehensive documentation

---

## 🎉 Project Status: **COMPLETE**

All requested functionality has been implemented and tested. The research games website is ready for pilot testing and IRB submission!

**Built with:** jsPsych 7.3.4, Node.js 18, Express.js, PostgreSQL 15, Docker, Nginx

**Optimized for:** Mozilla Firefox

**Ready for:** Data collection and psychological research

---

*For questions or issues, refer to the documentation in the `docs/` directory or check the GitHub repository.*
