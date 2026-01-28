/**
 * ============================================================================
 * API Routes
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { stringify } = require('csv-stringify/sync');

const {
    Participant,
    Experiment1,
    Experiment2,
    Experiment3,
    AdminUser,
    ConditionAssignment,
    sequelize
} = require('../models');

const validation = require('../middleware/validation');

// ============================================================================
// PARTICIPANT CONSENT
// ============================================================================

router.post('/consent', validation.validateConsent, async (req, res) => {
    try {
        const { experiment_type, consent_given, user_agent, ip_address } = req.body;

        if (!consent_given) {
            return res.status(400).json({
                error: 'Consent must be given to participate'
            });
        }

        // Get next condition assignment (balanced randomization)
        const condition = await getNextCondition(experiment_type);

        // Generate participant ID
        const prefix = {
            'treasure_hunt': 'TH',
            'career_choice': 'CC',
            'pattern_memory': 'PM'
        }[experiment_type];

        const participant_id = `${prefix}_${Date.now()}_${uuidv4().substring(0, 8)}`;

        // Create participant record
        const participant = await Participant.create({
            participant_id,
            experiment_type,
            condition,
            consent_given: true,
            start_time: new Date(),
            user_agent: user_agent || req.headers['user-agent'],
            ip_address: ip_address || req.ip
        });

        res.status(201).json({
            success: true,
            participant_id: participant.participant_id,
            experiment_type: participant.experiment_type,
            condition: participant.condition,
            timestamp: participant.created_at
        });

    } catch (error) {
        console.error('Error in /consent:', error);
        res.status(500).json({
            error: 'Failed to record consent',
            message: error.message
        });
    }
});

// ============================================================================
// CONDITION ASSIGNMENT
// ============================================================================

router.get('/assign/:experiment', async (req, res) => {
    try {
        const experiment = req.params.experiment;

        // Validate experiment type
        const validExperiments = ['treasure_hunt', 'career_choice', 'pattern_memory'];
        if (!validExperiments.includes(experiment)) {
            return res.status(400).json({
                error: `Invalid experiment type. Must be one of: ${validExperiments.join(', ')}`
            });
        }

        // Get next condition
        const condition = await getNextCondition(experiment);

        // Generate participant ID
        const prefix = {
            'treasure_hunt': 'TH',
            'career_choice': 'CC',
            'pattern_memory': 'PM'
        }[experiment];

        const participant_id = `${prefix}_${Date.now()}_${uuidv4().substring(0, 8)}`;

        res.status(200).json({
            participant_id,
            experiment,
            condition,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in /assign:', error);
        res.status(500).json({
            error: 'Failed to assign condition',
            message: error.message
        });
    }
});

// ============================================================================
// SAVE EXPERIMENT DATA
// ============================================================================

router.post('/experiment/:id/save', async (req, res) => {
    try {
        const experimentId = req.params.id;
        const data = req.body;

        // Validate participant exists
        const participant = await Participant.findOne({
            where: { participant_id: data.participant_id }
        });

        if (!participant) {
            return res.status(404).json({
                error: 'Participant not found. Please complete consent first.'
            });
        }

        // Update participant end time
        await participant.update({
            end_time: new Date()
        });

        // Check duration for exclusion
        const durationMinutes = participant.duration_seconds / 60;
        if (durationMinutes < 5 || durationMinutes > 30) {
            await participant.update({
                excluded: true,
                exclusion_reason: `Duration out of range: ${durationMinutes.toFixed(1)} minutes`
            });
        }

        // Save experiment-specific data
        let result;
        switch (experimentId) {
            case '1':
                result = await saveExperiment1(data);
                break;
            case '2':
                result = await saveExperiment2(data);
                break;
            case '3':
                result = await saveExperiment3(data);
                break;
            default:
                return res.status(400).json({
                    error: 'Invalid experiment ID. Must be 1, 2, or 3.'
                });
        }

        res.status(201).json({
            success: true,
            message: 'Data saved successfully',
            participant_id: data.participant_id
        });

    } catch (error) {
        console.error('Error in /experiment/:id/save:', error);
        res.status(500).json({
            error: 'Failed to save experiment data',
            message: error.message
        });
    }
});

// ============================================================================
// COLLECTION STATISTICS
// ============================================================================

router.get('/stats/:experiment', async (req, res) => {
    try {
        const experiment = req.params.experiment;

        // Get condition counts
        const conditions = await ConditionAssignment.findAll({
            where: { experiment_type: experiment }
        });

        if (conditions.length === 0) {
            return res.status(404).json({
                error: `No data found for experiment: ${experiment}`
            });
        }

        const stats = {
            experiment,
            conditions: {},
            total: 0,
            target_total: 0
        };

        conditions.forEach(cond => {
            stats.conditions[cond.condition] = {
                count: cond.count,
                target: cond.target_count,
                progress: `${Math.round((cond.count / cond.target_count) * 100)}%`
            };
            stats.total += cond.count;
            stats.target_total += cond.target_count;
        });

        stats.overall_progress = `${Math.round((stats.total / stats.target_total) * 100)}%`;

        res.status(200).json(stats);

    } catch (error) {
        console.error('Error in /stats:', error);
        res.status(500).json({
            error: 'Failed to retrieve statistics',
            message: error.message
        });
    }
});

// ============================================================================
// DATA EXPORT
// ============================================================================

router.get('/export/:experiment/:format', async (req, res) => {
    try {
        const { experiment, format } = req.params;

        if (!['csv', 'json'].includes(format)) {
            return res.status(400).json({
                error: 'Format must be either "csv" or "json"'
            });
        }

        let data;
        switch (experiment) {
            case 'treasure_hunt':
                data = await exportExperiment1();
                break;
            case 'career_choice':
                data = await exportExperiment2();
                break;
            case 'pattern_memory':
                data = await exportExperiment3();
                break;
            default:
                return res.status(400).json({
                    error: 'Invalid experiment. Must be: treasure_hunt, career_choice, or pattern_memory'
                });
        }

        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${experiment}_data.json"`);
            return res.json(data);
        }

        // CSV format
        if (data.length === 0) {
            return res.status(404).json({
                error: 'No data available for export'
            });
        }

        const csv = stringify(data, { header: true });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${experiment}_data.csv"`);
        res.send(csv);

    } catch (error) {
        console.error('Error in /export:', error);
        res.status(500).json({
            error: 'Failed to export data',
            message: error.message
        });
    }
});

// ============================================================================
// ADMIN LOGIN
// ============================================================================

router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                error: 'Username and password required'
            });
        }

        // Find admin user
        const admin = await AdminUser.findOne({
            where: { username, active: true }
        });

        if (!admin) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, admin.password_hash);
        if (!validPassword) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }

        // Update last login
        await admin.update({ last_login: new Date() });

        // Generate JWT
        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role },
            process.env.JWT_SECRET || 'default_secret_change_in_production',
            { expiresIn: '24h' }
        );

        res.status(200).json({
            success: true,
            token,
            user: {
                username: admin.username,
                role: admin.role
            }
        });

    } catch (error) {
        console.error('Error in /admin/login:', error);
        res.status(500).json({
            error: 'Login failed',
            message: error.message
        });
    }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getNextCondition(experimentType) {
    // Use PostgreSQL function for balanced randomization
    const result = await sequelize.query(
        'SELECT get_next_condition(:experimentType) as condition',
        {
            replacements: { experimentType },
            type: sequelize.QueryTypes.SELECT
        }
    );
    return result[0].condition;
}

async function saveExperiment1(data) {
    return await Experiment1.create({
        participant_id: data.participant_id,
        extinction_chests_opened: data.extinction_chests_opened,
        total_coins: data.total_coins,
        practice_trials: data.practice_trials,
        acquisition_trials: data.acquisition_trials,
        extinction_trials: data.extinction_trials,
        survey_responses: data.survey_responses,
        completion_code: data.completion_code
    });
}

async function saveExperiment2(data) {
    const responses = data.scenario_responses || {};
    return await Experiment2.create({
        participant_id: data.participant_id,
        scenario_order: data.scenario_order,
        tenure_A: responses.A?.tenure_intention_months,
        tenure_B: responses.B?.tenure_intention_months,
        tenure_C: responses.C?.tenure_intention_months,
        value_A: responses.A?.recognition_value_rating,
        value_B: responses.B?.recognition_value_rating,
        value_C: responses.C?.recognition_value_rating,
        attractiveness_A: responses.A?.attractiveness_rating,
        attractiveness_B: responses.B?.attractiveness_rating,
        attractiveness_C: responses.C?.attractiveness_rating,
        salary_equiv_A: responses.A?.salary_equivalent,
        salary_equiv_B: responses.B?.salary_equivalent,
        salary_equiv_C: responses.C?.salary_equivalent,
        comparative_rankings: data.comparative_rankings,
        forced_choice: data.forced_choice,
        manipulation_checks: data.manipulation_checks,
        mechanism_data: data.mechanism_data,
        digit_span_score: data.digit_span_score,
        demographics: data.demographics,
        completion_code: data.completion_code
    });
}

async function saveExperiment3(data) {
    return await Experiment3.create({
        participant_id: data.participant_id,
        condition: data.condition,
        card_sequence: data.card_sequence,
        expectation_rating: data.expectation_rating,
        betting_summary: data.betting_summary,
        encoding_phase: data.encoding_phase,
        distractor_task: data.distractor_task,
        memory_test_data: data.memory_test_data,
        betting_trials: data.betting_trials,
        mechanism_data: data.mechanism_data,
        digit_span_score: data.digit_span_score,
        attention_checks: data.attention_checks,
        completion_code: data.completion_code
    });
}

async function exportExperiment1() {
    const data = await sequelize.query('SELECT * FROM exp1_export', {
        type: sequelize.QueryTypes.SELECT
    });
    return data;
}

async function exportExperiment2() {
    const data = await sequelize.query('SELECT * FROM exp2_export', {
        type: sequelize.QueryTypes.SELECT
    });
    return data;
}

async function exportExperiment3() {
    const data = await sequelize.query('SELECT * FROM exp3_export', {
        type: sequelize.QueryTypes.SELECT
    });
    return data;
}

module.exports = router;
