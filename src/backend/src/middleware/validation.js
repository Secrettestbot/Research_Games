/**
 * ============================================================================
 * Validation Middleware using Joi
 * ============================================================================
 */

const Joi = require('joi');

// ============================================================================
// CONSENT VALIDATION
// ============================================================================

const consentSchema = Joi.object({
    experiment_type: Joi.string()
        .valid('treasure_hunt', 'career_choice', 'pattern_memory')
        .required(),
    consent_given: Joi.boolean().valid(true).required(),
    user_agent: Joi.string().optional(),
    ip_address: Joi.string().ip().optional()
});

function validateConsent(req, res, next) {
    const { error } = consentSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            error: 'Validation error',
            details: error.details[0].message
        });
    }
    next();
}

// ============================================================================
// EXPERIMENT 1 VALIDATION
// ============================================================================

const experiment1Schema = Joi.object({
    participant_id: Joi.string().pattern(/^TH_/).required(),
    condition: Joi.string().valid('BASELINE', 'HIGH_EFFORT', 'NR_PATTERN', 'RN_PATTERN').required(),
    extinction_chests_opened: Joi.number().integer().min(0).max(30).required(),
    total_coins: Joi.number().integer().min(0).required(),
    practice_trials: Joi.array().optional(),
    acquisition_trials: Joi.array().optional(),
    extinction_trials: Joi.array().optional(),
    survey_responses: Joi.object().optional(),
    start_time: Joi.date().iso().optional(),
    end_time: Joi.date().iso().optional(),
    completion_code: Joi.string().optional()
});

// ============================================================================
// EXPERIMENT 2 VALIDATION
// ============================================================================

const experiment2Schema = Joi.object({
    participant_id: Joi.string().pattern(/^CC_/).required(),
    scenario_order: Joi.array().items(Joi.string().valid('A', 'B', 'C')).length(3).required(),
    scenario_responses: Joi.object({
        A: Joi.object({
            tenure_intention_months: Joi.number().integer().min(0).max(24).required(),
            recognition_value_rating: Joi.number().integer().min(0).max(100).required(),
            attractiveness_rating: Joi.number().integer().min(1).max(7).optional(),
            salary_equivalent: Joi.number().integer().optional()
        }).required(),
        B: Joi.object({
            tenure_intention_months: Joi.number().integer().min(0).max(24).required(),
            recognition_value_rating: Joi.number().integer().min(0).max(100).required(),
            attractiveness_rating: Joi.number().integer().min(1).max(7).optional(),
            salary_equivalent: Joi.number().integer().optional()
        }).required(),
        C: Joi.object({
            tenure_intention_months: Joi.number().integer().min(0).max(24).required(),
            recognition_value_rating: Joi.number().integer().min(0).max(100).required(),
            attractiveness_rating: Joi.number().integer().min(1).max(7).optional(),
            salary_equivalent: Joi.number().integer().optional()
        }).required()
    }).required(),
    comparative_rankings: Joi.object().optional(),
    forced_choice: Joi.object().optional(),
    manipulation_checks: Joi.object().optional(),
    mechanism_data: Joi.object().optional(),
    digit_span_score: Joi.number().integer().min(0).max(12).optional(),
    demographics: Joi.object().optional(),
    start_time: Joi.date().iso().optional(),
    end_time: Joi.date().iso().optional(),
    completion_code: Joi.string().optional()
});

// ============================================================================
// EXPERIMENT 3 VALIDATION
// ============================================================================

const experiment3Schema = Joi.object({
    participant_id: Joi.string().pattern(/^PM_/).required(),
    condition: Joi.string().valid('NR_PATTERN', 'RANDOM').required(),
    card_sequence: Joi.array().items(Joi.number().integer().valid(0, 1)).required(),
    expectation_rating: Joi.number().integer().min(1).max(7).required(),
    betting_summary: Joi.object({
        n_blank_trials: Joi.number().integer().min(0).required(),
        n_bet_ace_after_blank: Joi.number().integer().min(0).required(),
        pct_bet_ace_after_blank: Joi.number().min(0).max(1).required()
    }).required(),
    encoding_phase: Joi.object().optional(),
    distractor_task: Joi.object().optional(),
    memory_test_data: Joi.object().optional(),
    betting_trials: Joi.array().optional(),
    mechanism_data: Joi.object().optional(),
    digit_span_score: Joi.number().integer().min(0).max(12).optional(),
    attention_checks: Joi.object().optional(),
    start_time: Joi.date().iso().optional(),
    end_time: Joi.date().iso().optional(),
    completion_code: Joi.string().optional()
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    validateConsent,
    experiment1Schema,
    experiment2Schema,
    experiment3Schema
};
