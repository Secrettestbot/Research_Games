# Web Integration Guide

This guide explains how to deploy the Festinger vs. Capaldi experiments as web applications.

## Overview of Options

| Option | Effort | Cost | Best For |
|--------|--------|------|----------|
| **Pavlovia** | Low | ~$0.20/participant | Quick deployment of PsychoPy experiments |
| **jsPsych + Custom Server** | Medium | Server costs only | Full control, institutional hosting |
| **Qualtrics** | Low | Institutional license | Experiment 2 (survey-based) |
| **Full Custom (React/Vue)** | High | Server costs | Maximum customization |

---

## Option 1: Pavlovia (Recommended for Quick Start)

### What is Pavlovia?
Pavlovia (pavlovia.org) is a hosting service for PsychoPy experiments. It automatically converts PsychoPy Python code to JavaScript (PsychoJS).

### Steps:
1. **Create Pavlovia account** at pavlovia.org
2. **Sync experiments** from PsychoPy Builder:
   - Open `treasure_hunt.py` in PsychoPy Builder
   - Click "Sync with Pavlovia" (globe icon)
   - Follow prompts to create GitLab repository
3. **Set experiment to "Running"** in Pavlovia dashboard
4. **Share URL** with participants

### Cost:
- ~$0.20 per participant (credits system)
- Institutional licenses available
- Free for piloting (<100 participants)

### Pros:
- Minimal code changes
- Precise timing
- Built-in data collection
- GDPR compliant

### Cons:
- Per-participant cost
- Less flexibility
- Requires PsychoPy Builder

---

## Option 2: jsPsych (This Implementation)

### What's Included:

```
web/
├── experiment1_jspsych/
│   └── index.html          # Experiment 1 (jsPsych, self-contained)
├── server/
│   ├── server.js           # Express.js backend
│   └── package.json        # Dependencies
└── WEB_INTEGRATION_GUIDE.md
```

### Setup Instructions:

#### 1. Install Node.js
Download from https://nodejs.org/ (v16 or higher)

#### 2. Install dependencies
```bash
cd web/server
npm install
```

#### 3. Start the server
```bash
npm start
```

#### 4. Access experiments
- http://localhost:3000/ - Landing page
- http://localhost:3000/experiment1 - Treasure Hunt
- http://localhost:3000/api/stats/treasure_hunt - View collection stats

### Deploying to Production:

#### Option A: University Server
```bash
# On your server (Linux)
git clone <your-repo>
cd Research_Games/web/server
npm install --production
npm start
```

Consider using PM2 for process management:
```bash
npm install -g pm2
pm2 start server.js --name "research-games"
pm2 startup  # Auto-restart on reboot
```

#### Option B: Heroku (Free/Low-cost)
```bash
# Install Heroku CLI
heroku login
heroku create research-games-yourname
git push heroku main
```

#### Option C: DigitalOcean/AWS/Google Cloud
- Create VM (Ubuntu recommended)
- Install Node.js
- Clone repository
- Use nginx as reverse proxy
- Add SSL with Let's Encrypt

### Data Collection:

Data is saved to `web/server/data/` as JSON files:
```
data/
├── treasure_hunt/
│   ├── TR_1706123456_abc123.json
│   └── TR_1706123789_def456.json
├── career_choice/
└── pattern_memory/
```

Export to CSV:
- Visit: http://localhost:3000/api/export/treasure_hunt
- Or programmatically via the API

---

## Option 3: Qualtrics (Best for Experiment 2)

Experiment 2 (Career Choice Study) is survey-based and works well in Qualtrics.

### Setup:
1. Create new survey in Qualtrics
2. Import survey structure from `career_survey.py`
3. Add JavaScript for working memory test (see code in `career_survey.py`)
4. Configure randomization for scenario order
5. Set up embedded data fields

### Key Qualtrics Features to Use:
- **Survey Flow** → Randomizer (for scenario order)
- **Embedded Data** for condition tracking
- **JavaScript** for digit span test
- **Display Logic** for attention checks

---

## Option 4: Full Custom Implementation

For maximum control, build with modern web frameworks.

### Technology Stack:
- **Frontend**: React or Vue.js
- **Backend**: Node.js (Express) or Python (FastAPI)
- **Database**: PostgreSQL or MongoDB
- **Hosting**: AWS, Google Cloud, or Vercel

### When to Choose This:
- Need advanced features (adaptive testing, real-time collaboration)
- Integration with existing systems
- Very large scale (10,000+ participants)
- Custom analytics dashboards

### Estimated Development Time:
- Basic implementation: 2-4 weeks
- Full-featured: 1-3 months

---

## Technical Requirements Comparison

| Requirement | Pavlovia | jsPsych | Qualtrics | Custom |
|-------------|----------|---------|-----------|--------|
| Precise timing (<50ms) | ✅ | ⚠️ | ❌ | ⚠️ |
| Rapid clicking | ✅ | ✅ | ❌ | ✅ |
| Survey questions | ⚠️ | ✅ | ✅ | ✅ |
| Mobile support | ⚠️ | ✅ | ✅ | ✅ |
| Offline capability | ❌ | ⚠️ | ❌ | ✅ |
| Data security | ✅ | ⚠️* | ✅ | ⚠️* |

*Depends on your server configuration

---

## Security Considerations

### For Any Web Deployment:

1. **HTTPS Required**
   - Use Let's Encrypt for free SSL
   - Never transmit data over HTTP

2. **Data Privacy**
   - Don't collect identifying information unless necessary
   - Store data securely (encrypted at rest)
   - Have clear data retention policy

3. **Bot Protection**
   - Implement CAPTCHA or honeypot fields
   - Check for impossible response times
   - Monitor for duplicate IP addresses

4. **IRB Compliance**
   - Ensure informed consent before data collection
   - Provide withdrawal mechanism
   - Document data handling procedures

---

## Recommended Approach

### For Quick Pilot Testing:
→ Use **Pavlovia** (minimal setup, reliable)

### For Full Data Collection:
→ Use **jsPsych + Node.js server** (included in this repo)

### For Experiment 2 Only:
→ Use **Qualtrics** if your institution has a license

### For Long-term Research Program:
→ Invest in **custom implementation** with proper infrastructure

---

## Getting Help

### jsPsych Documentation:
https://www.jspsych.org/7.3/

### PsychoPy/Pavlovia:
https://pavlovia.org/docs

### Node.js/Express:
https://expressjs.com/

### Common Issues:

**Q: Timing is inconsistent**
A: Use requestAnimationFrame() for animations; avoid setTimeout for critical timing

**Q: Data not saving**
A: Check browser console for errors; verify server is running; check CORS settings

**Q: Mobile doesn't work**
A: Test touch events; adjust button sizes; consider orientation lock

---

## File Structure for Complete Web Deployment

```
web/
├── experiment1_jspsych/
│   └── index.html      # Currently the only web-deployed experiment
│
├── server/
│   ├── server.js
│   ├── package.json
│   └── data/           # Created at runtime
│
└── WEB_INTEGRATION_GUIDE.md
```

Experiments 2 and 3 do not have web ports yet — see the Python implementations
in `experiments/experiment2_career_choice/` and `experiments/experiment3_pattern_memory/`.

---

## Next Steps

1. **Choose your deployment method** based on resources and timeline
2. **Set up development environment** following instructions above
3. **Run pilot test** with 20-30 participants
4. **Check data quality** and make adjustments
5. **Deploy for full data collection**
6. **Monitor progress** using /api/stats endpoints

Good luck with your research!
