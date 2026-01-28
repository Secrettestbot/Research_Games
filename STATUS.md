# Project Status - Research Games Website

**Last Updated**: 2026-01-27

## ✅ Completed Infrastructure (Overlord)

### Project Setup
- [x] Directory structure created
- [x] Git repository initialized
- [x] README.md with project overview
- [x] .gitignore configured

### Docker Infrastructure
- [x] `docker-compose.yml` - 4 services (nginx, api, postgres, adminer)
- [x] `.env.example` - Environment variable template
- [x] `src/docker/nginx/Dockerfile` - Nginx container config
- [x] `src/docker/nginx/nginx.conf` - Web server + reverse proxy config
- [x] `src/docker/scripts/start.sh` - Deployment automation script
- [x] `src/docker/scripts/backup.sh` - Data backup automation

### Documentation
- [x] `docs/API_CONTRACT.md` - Complete API specification for all endpoints
- [x] `docs/DEPLOYMENT_GUIDE.md` - Production deployment guide
- [x] `docs/RESEARCHER_GUIDE.md` - End-user guide for researchers

### Terminal Communication
- [x] Fixed terminal communication system
- [x] Successfully delegated tasks to T1, T2, T3
- [x] Status check messages sent

---

## 🔄 In Progress (Delegated to Terminals)

### T3 - Docker Components
**Status**: Awaiting response
**Tasks**:
- [ ] `src/docker/backend/Dockerfile` - Node.js backend container
- [ ] `src/docker/postgres/init.sql` - Database schema with 5 tables
- [ ] Additional deployment scripts

### T2 - Backend API
**Status**: Awaiting response
**Tasks**:
- [ ] `src/backend/package.json` - Dependencies
- [ ] `src/backend/src/server.js` - Express app
- [ ] `src/backend/src/models/` - Sequelize models (5 tables)
- [ ] `src/backend/src/routes/api.js` - API endpoints
- [ ] `src/backend/src/middleware/validation.js` - Joi validation
- [ ] `src/backend/src/utils/randomization.js` - Condition assignment
- [ ] `src/backend/src/utils/export.js` - CSV export for R

### T1 - Frontend UI
**Status**: Awaiting response
**Tasks**:
- [ ] `src/frontend/public/index.html` - Landing page + consent
- [ ] `src/frontend/public/experiment1.html` - Treasure Hunt page
- [ ] `src/frontend/public/experiment2.html` - Career Choice page
- [ ] `src/frontend/public/experiment3.html` - Pattern Memory page
- [ ] `src/frontend/public/debrief.html` - Debriefing page
- [ ] `src/frontend/experiments/experiment1-treasure.js` - jsPsych implementation
- [ ] `src/frontend/experiments/experiment2-career.js` - jsPsych implementation
- [ ] `src/frontend/experiments/experiment3-pattern.js` - jsPsych implementation
- [ ] `src/frontend/assets/css/styles.css` - Firefox-optimized styles
- [ ] `src/frontend/assets/js/api-client.js` - API wrapper
- [ ] Download jsPsych 7.x library

---

## ⏳ Pending (Next Steps)

### Integration & Testing
- [ ] Integrate frontend with backend API
- [ ] Test all three experiments end-to-end
- [ ] Verify data saves correctly to database
- [ ] Test condition assignment balancing
- [ ] Validate CSV export format for R

### Firefox Optimization
- [ ] Test all pages in Firefox
- [ ] Optimize CSS for Firefox rendering
- [ ] Test responsiveness on different screen sizes
- [ ] Verify jsPsych compatibility

### Data Validation
- [ ] Verify ALL primary DVs are captured:
  - Exp1: `extinction_chests_opened`
  - Exp2: `tenure_A/B/C`, `value_A/B/C`
  - Exp3: `expectation_rating`, `pct_bet_ace_after_blank`
- [ ] Test exclusion criteria implementation
- [ ] Verify completion codes generate correctly

### Deployment Testing
- [ ] Test `docker-compose up` from scratch
- [ ] Verify all services start and connect
- [ ] Test backup script
- [ ] Test restore procedure
- [ ] Load testing with concurrent users

### Final Documentation
- [ ] Create video walkthrough for researchers
- [ ] Add troubleshooting FAQ
- [ ] Document IRB submission materials
- [ ] Create quick reference card

---

## 📊 Database Schema (To be implemented by T2/T3)

### participants
```sql
id (PK), participant_id (UNIQUE), experiment_type, condition,
consent_given, start_time, end_time, ip_address, user_agent,
excluded, exclusion_reason
```

### experiment1_treasure
```sql
id (PK), participant_id (FK), total_coins,
extinction_chests_opened (PRIMARY DV),
practice_trials (JSONB), acquisition_trials (JSONB),
extinction_trials (JSONB), survey_responses (JSONB),
completion_code
```

### experiment2_career
```sql
id (PK), participant_id (FK), scenario_order (JSONB),
tenure_A (PRIMARY DV), tenure_B (PRIMARY DV), tenure_C (PRIMARY DV),
value_A (PRIMARY DV), value_B (PRIMARY DV), value_C (PRIMARY DV),
attractiveness_A, attractiveness_B, attractiveness_C,
salary_equiv_A, salary_equiv_B, salary_equiv_C,
manipulation_checks (JSONB), mechanism_data (JSONB),
demographics (JSONB), digit_span_score, completion_code
```

### experiment3_pattern
```sql
id (PK), participant_id (FK), condition,
card_sequence (JSONB), expectation_rating (PRIMARY DV),
betting_summary (JSONB with pct_bet_ace_after_blank as PRIMARY DV),
memory_test_data (JSONB), betting_trials (JSONB),
mechanism_data (JSONB), digit_span_score,
attention_checks (JSONB), completion_code
```

### admin_users
```sql
id (PK), username (UNIQUE), password_hash,
role, created_at, last_login
```

---

## 🎯 Success Criteria

Before launch:
- [ ] All 3 experiments load without errors
- [ ] Data saves successfully to PostgreSQL
- [ ] CSV export works for R analysis
- [ ] Condition assignment is balanced
- [ ] Firefox compatibility verified
- [ ] Docker deployment works with single command
- [ ] Backup/restore tested
- [ ] All primary DVs captured correctly

---

## 🐛 Known Issues

None yet - awaiting terminal responses for initial implementation.

---

## 📝 Notes

- Terminal communication system fixed: Use `export CLAUDE_SESSION_ID=$PPID` before sending messages
- Original experiment code available at `/tmp/research_games`
- Experiment 1 has existing jsPsych implementation to adapt
- Experiments 2 & 3 need new jsPsych implementations built from Python specs
- Firefox optimization prioritized per user requirements
- Docker infrastructure follows production-ready best practices

---

## Next Actions

1. **Wait for terminal responses** on current progress
2. **Review and integrate** terminal work
3. **Test components** as they're completed
4. **Iterate** on any issues found
5. **Deploy** once all components verified
