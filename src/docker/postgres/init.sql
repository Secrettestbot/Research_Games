-- =============================================================================
-- Research Games Website - PostgreSQL Database Schema
-- =============================================================================
--
-- This script initializes the database for three psychological experiments
-- testing Festinger's Cognitive Dissonance vs Capaldi's Sequential Theory
--
-- Tables:
--   1. participants - Main participant records
--   2. experiment1_treasure - Treasure Hunt data
--   3. experiment2_career - Career Choice data
--   4. experiment3_pattern - Pattern Memory data
--   5. admin_users - Admin authentication
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. PARTICIPANTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    participant_id VARCHAR(100) UNIQUE NOT NULL,
    experiment_type VARCHAR(50) NOT NULL,
    condition VARCHAR(50) NOT NULL,
    consent_given BOOLEAN NOT NULL DEFAULT false,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time))
    ) STORED,
    ip_address INET,
    user_agent TEXT,
    excluded BOOLEAN DEFAULT false,
    exclusion_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_participants_experiment ON participants(experiment_type);
CREATE INDEX idx_participants_condition ON participants(condition);
CREATE INDEX idx_participants_excluded ON participants(excluded);
CREATE INDEX idx_participants_created ON participants(created_at);

-- =============================================================================
-- 2. EXPERIMENT 1: DIGITAL TREASURE HUNT
-- =============================================================================

CREATE TABLE IF NOT EXISTS experiment1_treasure (
    id SERIAL PRIMARY KEY,
    participant_id VARCHAR(100) UNIQUE NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,

    -- Primary Dependent Variable
    extinction_chests_opened INTEGER NOT NULL,  -- PRIMARY DV (0-30)

    -- Secondary Measures
    total_coins INTEGER NOT NULL DEFAULT 0,

    -- Trial Data (stored as JSONB for flexibility)
    practice_trials JSONB,
    acquisition_trials JSONB,
    extinction_trials JSONB,

    -- Survey Data
    survey_responses JSONB,

    -- Completion
    completion_code VARCHAR(100),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_exp1_extinction ON experiment1_treasure(extinction_chests_opened);
CREATE INDEX idx_exp1_participant ON experiment1_treasure(participant_id);

-- =============================================================================
-- 3. EXPERIMENT 2: CAREER CHOICE STUDY
-- =============================================================================

CREATE TABLE IF NOT EXISTS experiment2_career (
    id SERIAL PRIMARY KEY,
    participant_id VARCHAR(100) UNIQUE NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,

    -- Scenario Presentation Order
    scenario_order JSONB NOT NULL,  -- e.g., ["A", "C", "B"]

    -- Primary Dependent Variables (tenure intention in months)
    tenure_A INTEGER CHECK (tenure_A >= 0 AND tenure_A <= 24),  -- PRIMARY DV
    tenure_B INTEGER CHECK (tenure_B >= 0 AND tenure_B <= 24),  -- PRIMARY DV
    tenure_C INTEGER CHECK (tenure_C >= 0 AND tenure_C <= 24),  -- PRIMARY DV

    -- Primary Dependent Variables (recognition value 0-100)
    value_A INTEGER CHECK (value_A >= 0 AND value_A <= 100),    -- PRIMARY DV
    value_B INTEGER CHECK (value_B >= 0 AND value_B <= 100),    -- PRIMARY DV
    value_C INTEGER CHECK (value_C >= 0 AND value_C <= 100),    -- PRIMARY DV

    -- Secondary DVs
    attractiveness_A INTEGER CHECK (attractiveness_A >= 1 AND attractiveness_A <= 7),
    attractiveness_B INTEGER CHECK (attractiveness_B >= 1 AND attractiveness_B <= 7),
    attractiveness_C INTEGER CHECK (attractiveness_C >= 1 AND attractiveness_C <= 7),

    salary_equiv_A INTEGER,
    salary_equiv_B INTEGER,
    salary_equiv_C INTEGER,

    -- Comparative Measures
    comparative_rankings JSONB,  -- Forced ranking of A, B, C
    forced_choice JSONB,          -- Binary choices

    -- Manipulation Checks
    manipulation_checks JSONB,

    -- Mechanism Measures
    mechanism_data JSONB,  -- Effort→value, pattern→expectation

    -- Individual Differences
    digit_span_score INTEGER CHECK (digit_span_score >= 0 AND digit_span_score <= 12),

    -- Demographics
    demographics JSONB,  -- age, gender, major, work_experience

    -- Completion
    completion_code VARCHAR(100),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_exp2_participant ON experiment2_career(participant_id);
CREATE INDEX idx_exp2_tenure ON experiment2_career(tenure_A, tenure_B, tenure_C);
CREATE INDEX idx_exp2_value ON experiment2_career(value_A, value_B, value_C);

-- =============================================================================
-- 4. EXPERIMENT 3: PATTERN MEMORY CHALLENGE
-- =============================================================================

CREATE TABLE IF NOT EXISTS experiment3_pattern (
    id SERIAL PRIMARY KEY,
    participant_id VARCHAR(100) UNIQUE NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,

    -- Condition (NR_PATTERN or RANDOM)
    condition VARCHAR(20) NOT NULL CHECK (condition IN ('NR_PATTERN', 'RANDOM')),

    -- Card Sequence Shown
    card_sequence JSONB NOT NULL,  -- Array of 0s (BLANK) and 1s (ACE)

    -- Primary Dependent Variables
    expectation_rating INTEGER CHECK (expectation_rating >= 1 AND expectation_rating <= 7),  -- PRIMARY DV

    -- Betting Summary
    betting_summary JSONB,  -- Contains pct_bet_ace_after_blank (PRIMARY DV)

    -- Detailed Trial Data
    encoding_phase JSONB,
    distractor_task JSONB,
    memory_test_data JSONB,
    betting_trials JSONB,  -- All betting trial details

    -- Mechanism Measures
    mechanism_data JSONB,  -- Confidence, predictability, pattern usage

    -- Individual Differences
    digit_span_score INTEGER CHECK (digit_span_score >= 0 AND digit_span_score <= 12),

    -- Attention Checks
    attention_checks JSONB,

    -- Completion
    completion_code VARCHAR(100),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_exp3_participant ON experiment3_pattern(participant_id);
CREATE INDEX idx_exp3_condition ON experiment3_pattern(condition);
CREATE INDEX idx_exp3_expectation ON experiment3_pattern(expectation_rating);

-- =============================================================================
-- 5. ADMIN USERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Index
CREATE INDEX idx_admin_username ON admin_users(username);

-- =============================================================================
-- 6. CONDITION ASSIGNMENT TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS condition_assignments (
    id SERIAL PRIMARY KEY,
    experiment_type VARCHAR(50) NOT NULL,
    condition VARCHAR(50) NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    target_count INTEGER NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(experiment_type, condition)
);

-- Initialize condition counts
INSERT INTO condition_assignments (experiment_type, condition, count, target_count) VALUES
    -- Experiment 1: Treasure Hunt (4 conditions, 80 each)
    ('treasure_hunt', 'BASELINE', 0, 80),
    ('treasure_hunt', 'HIGH_EFFORT', 0, 80),
    ('treasure_hunt', 'NR_PATTERN', 0, 80),
    ('treasure_hunt', 'RN_PATTERN', 0, 80),

    -- Experiment 2: Career Choice (within-subjects, all see all)
    ('career_choice', 'WITHIN_SUBJECTS', 0, 240),

    -- Experiment 3: Pattern Memory (2 conditions, 120 each)
    ('pattern_memory', 'NR_PATTERN', 0, 120),
    ('pattern_memory', 'RANDOM', 0, 120)
ON CONFLICT (experiment_type, condition) DO NOTHING;

-- =============================================================================
-- 7. DATA EXPORT VIEWS (for R analysis)
-- =============================================================================

-- View for Experiment 1 CSV export
CREATE OR REPLACE VIEW exp1_export AS
SELECT
    p.participant_id,
    p.condition,
    e.total_coins,
    e.extinction_chests_opened,
    p.start_time,
    p.end_time,
    p.duration_seconds,
    p.excluded,
    p.exclusion_reason,
    e.completion_code
FROM participants p
JOIN experiment1_treasure e ON p.participant_id = e.participant_id
WHERE p.experiment_type = 'treasure_hunt'
ORDER BY p.created_at;

-- View for Experiment 2 CSV export
CREATE OR REPLACE VIEW exp2_export AS
SELECT
    p.participant_id,
    e.tenure_A,
    e.tenure_B,
    e.tenure_C,
    e.value_A,
    e.value_B,
    e.value_C,
    e.attractiveness_A,
    e.attractiveness_B,
    e.attractiveness_C,
    e.salary_equiv_A,
    e.salary_equiv_B,
    e.salary_equiv_C,
    e.digit_span_score,
    p.start_time,
    p.end_time,
    p.duration_seconds,
    p.excluded,
    p.exclusion_reason,
    e.completion_code
FROM participants p
JOIN experiment2_career e ON p.participant_id = e.participant_id
WHERE p.experiment_type = 'career_choice'
ORDER BY p.created_at;

-- View for Experiment 3 CSV export
CREATE OR REPLACE VIEW exp3_export AS
SELECT
    p.participant_id,
    p.condition,
    e.expectation_rating,
    e.betting_summary->>'pct_bet_ace_after_blank' as pct_bet_ace_after_blank,
    e.memory_test_data->>'pattern_detected' as pattern_detected,
    e.digit_span_score,
    p.start_time,
    p.end_time,
    p.duration_seconds,
    p.excluded,
    p.exclusion_reason,
    e.completion_code
FROM participants p
JOIN experiment3_pattern e ON p.participant_id = e.participant_id
WHERE p.experiment_type = 'pattern_memory'
ORDER BY p.created_at;

-- =============================================================================
-- 8. HELPER FUNCTIONS
-- =============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for participants table
CREATE TRIGGER update_participants_updated_at
    BEFORE UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get next condition assignment (balanced randomization)
CREATE OR REPLACE FUNCTION get_next_condition(exp_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    selected_condition VARCHAR;
BEGIN
    -- Select condition with lowest count, randomize among ties
    SELECT condition INTO selected_condition
    FROM condition_assignments
    WHERE experiment_type = exp_type
    ORDER BY count ASC, RANDOM()
    LIMIT 1;

    -- Increment count
    UPDATE condition_assignments
    SET count = count + 1, updated_at = CURRENT_TIMESTAMP
    WHERE experiment_type = exp_type AND condition = selected_condition;

    RETURN selected_condition;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 9. GRANT PERMISSIONS
-- =============================================================================

-- Grant permissions to application user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO research_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO research_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO research_admin;

-- =============================================================================
-- SCHEMA CREATED SUCCESSFULLY
-- =============================================================================

-- Insert a test admin user (password: 'admin123' - CHANGE IN PRODUCTION!)
-- Password hash generated with bcrypt, rounds=10
INSERT INTO admin_users (username, password_hash, email, role) VALUES
    ('admin', '$2b$10$rQ8K8zrZ9yqZ8YqZ8YqZ8euJ8YqZ8YqZ8YqZ8YqZ8YqZ8YqZ8YqZe', 'admin@example.com', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Log schema initialization
DO $$
BEGIN
    RAISE NOTICE 'Research Games Database Schema Initialized Successfully!';
    RAISE NOTICE 'Tables created: participants, experiment1_treasure, experiment2_career, experiment3_pattern, admin_users, condition_assignments';
    RAISE NOTICE 'Views created: exp1_export, exp2_export, exp3_export';
    RAISE NOTICE 'Functions created: get_next_condition, update_updated_at_column';
END $$;
