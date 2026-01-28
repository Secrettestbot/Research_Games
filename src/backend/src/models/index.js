/**
 * ============================================================================
 * Sequelize Models
 * ============================================================================
 */

const { Sequelize, DataTypes } = require('sequelize');

// Database connection
const sequelize = new Sequelize(
    process.env.DATABASE_URL || 'postgresql://research_admin:password@localhost:5432/research_games',
    {
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// ============================================================================
// PARTICIPANT MODEL
// ============================================================================

const Participant = sequelize.define('Participant', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    participant_id: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false
    },
    experiment_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            isIn: [['treasure_hunt', 'career_choice', 'pattern_memory']]
        }
    },
    condition: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    consent_given: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    start_time: {
        type: DataTypes.DATE
    },
    end_time: {
        type: DataTypes.DATE
    },
    duration_seconds: {
        type: DataTypes.VIRTUAL,
        get() {
            const start = this.getDataValue('start_time');
            const end = this.getDataValue('end_time');
            if (start && end) {
                return Math.floor((end - start) / 1000);
            }
            return null;
        }
    },
    ip_address: {
        type: DataTypes.INET
    },
    user_agent: {
        type: DataTypes.TEXT
    },
    excluded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    exclusion_reason: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'participants',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// ============================================================================
// EXPERIMENT 1: TREASURE HUNT MODEL
// ============================================================================

const Experiment1 = sequelize.define('Experiment1', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    participant_id: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false,
        references: {
            model: 'participants',
            key: 'participant_id'
        }
    },
    extinction_chests_opened: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 0,
            max: 30
        }
    },
    total_coins: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    practice_trials: {
        type: DataTypes.JSONB
    },
    acquisition_trials: {
        type: DataTypes.JSONB
    },
    extinction_trials: {
        type: DataTypes.JSONB
    },
    survey_responses: {
        type: DataTypes.JSONB
    },
    completion_code: {
        type: DataTypes.STRING(100)
    }
}, {
    tableName: 'experiment1_treasure',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// ============================================================================
// EXPERIMENT 2: CAREER CHOICE MODEL
// ============================================================================

const Experiment2 = sequelize.define('Experiment2', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    participant_id: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false,
        references: {
            model: 'participants',
            key: 'participant_id'
        }
    },
    scenario_order: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    // Primary DVs - Tenure
    tenure_A: {
        type: DataTypes.INTEGER,
        validate: { min: 0, max: 24 }
    },
    tenure_B: {
        type: DataTypes.INTEGER,
        validate: { min: 0, max: 24 }
    },
    tenure_C: {
        type: DataTypes.INTEGER,
        validate: { min: 0, max: 24 }
    },
    // Primary DVs - Value
    value_A: {
        type: DataTypes.INTEGER,
        validate: { min: 0, max: 100 }
    },
    value_B: {
        type: DataTypes.INTEGER,
        validate: { min: 0, max: 100 }
    },
    value_C: {
        type: DataTypes.INTEGER,
        validate: { min: 0, max: 100 }
    },
    // Secondary DVs
    attractiveness_A: {
        type: DataTypes.INTEGER,
        validate: { min: 1, max: 7 }
    },
    attractiveness_B: {
        type: DataTypes.INTEGER,
        validate: { min: 1, max: 7 }
    },
    attractiveness_C: {
        type: DataTypes.INTEGER,
        validate: { min: 1, max: 7 }
    },
    salary_equiv_A: {
        type: DataTypes.INTEGER
    },
    salary_equiv_B: {
        type: DataTypes.INTEGER
    },
    salary_equiv_C: {
        type: DataTypes.INTEGER
    },
    comparative_rankings: {
        type: DataTypes.JSONB
    },
    forced_choice: {
        type: DataTypes.JSONB
    },
    manipulation_checks: {
        type: DataTypes.JSONB
    },
    mechanism_data: {
        type: DataTypes.JSONB
    },
    digit_span_score: {
        type: DataTypes.INTEGER,
        validate: { min: 0, max: 12 }
    },
    demographics: {
        type: DataTypes.JSONB
    },
    completion_code: {
        type: DataTypes.STRING(100)
    }
}, {
    tableName: 'experiment2_career',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// ============================================================================
// EXPERIMENT 3: PATTERN MEMORY MODEL
// ============================================================================

const Experiment3 = sequelize.define('Experiment3', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    participant_id: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false,
        references: {
            model: 'participants',
            key: 'participant_id'
        }
    },
    condition: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
            isIn: [['NR_PATTERN', 'RANDOM']]
        }
    },
    card_sequence: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    expectation_rating: {
        type: DataTypes.INTEGER,
        validate: { min: 1, max: 7 }
    },
    betting_summary: {
        type: DataTypes.JSONB
    },
    encoding_phase: {
        type: DataTypes.JSONB
    },
    distractor_task: {
        type: DataTypes.JSONB
    },
    memory_test_data: {
        type: DataTypes.JSONB
    },
    betting_trials: {
        type: DataTypes.JSONB
    },
    mechanism_data: {
        type: DataTypes.JSONB
    },
    digit_span_score: {
        type: DataTypes.INTEGER,
        validate: { min: 0, max: 12 }
    },
    attention_checks: {
        type: DataTypes.JSONB
    },
    completion_code: {
        type: DataTypes.STRING(100)
    }
}, {
    tableName: 'experiment3_pattern',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// ============================================================================
// ADMIN USER MODEL
// ============================================================================

const AdminUser = sequelize.define('AdminUser', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(255)
    },
    role: {
        type: DataTypes.STRING(50),
        defaultValue: 'admin',
        allowNull: false
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    last_login: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'admin_users',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// ============================================================================
// CONDITION ASSIGNMENT MODEL
// ============================================================================

const ConditionAssignment = sequelize.define('ConditionAssignment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    experiment_type: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    condition: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    target_count: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'condition_assignments',
    underscored: true,
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['experiment_type', 'condition']
        }
    ]
});

// ============================================================================
// ASSOCIATIONS
// ============================================================================

Participant.hasOne(Experiment1, { foreignKey: 'participant_id', sourceKey: 'participant_id' });
Experiment1.belongsTo(Participant, { foreignKey: 'participant_id', targetKey: 'participant_id' });

Participant.hasOne(Experiment2, { foreignKey: 'participant_id', sourceKey: 'participant_id' });
Experiment2.belongsTo(Participant, { foreignKey: 'participant_id', targetKey: 'participant_id' });

Participant.hasOne(Experiment3, { foreignKey: 'participant_id', sourceKey: 'participant_id' });
Experiment3.belongsTo(Participant, { foreignKey: 'participant_id', targetKey: 'participant_id' });

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    sequelize,
    Participant,
    Experiment1,
    Experiment2,
    Experiment3,
    AdminUser,
    ConditionAssignment
};
