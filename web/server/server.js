/**
 * ============================================================================
 * EXPERIMENT SERVER - Node.js Backend for Data Collection
 * ============================================================================
 *
 * Description:
 *   Simple Express.js server for hosting experiments and collecting data.
 *   Supports all three experiments in the Festinger vs Capaldi study.
 *
 * Features:
 *   - Static file serving for experiment pages
 *   - REST API for saving participant data
 *   - Participant assignment to conditions
 *   - Basic data validation
 *   - CSV export utility
 *
 * Usage:
 *   npm install
 *   npm start
 *
 * Requirements:
 *   - Node.js 16+
 *   - Express.js
 *   - cors
 *   - uuid
 *
 * Author: Research Games Project
 * Date: January 2025
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    port: process.env.PORT || 3000,
    dataDir: path.join(__dirname, 'data'),

    // Experiment conditions for balanced assignment
    experiments: {
        'treasure_hunt': {
            conditions: ['BASELINE', 'HIGH_EFFORT', 'NR_PATTERN', 'RN_PATTERN'],
            targetN: 80  // Per condition
        },
        'career_choice': {
            conditions: ['WITHIN_SUBJECTS'],  // All see all conditions
            targetN: 240
        },
        'pattern_memory': {
            conditions: ['NR_PATTERN', 'RANDOM'],
            targetN: 120  // Per condition
        }
    }
};

// ============================================================================
// SETUP
// ============================================================================

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../')));

// Ensure data directory exists
if (!fs.existsSync(CONFIG.dataDir)) {
    fs.mkdirSync(CONFIG.dataDir, { recursive: true });
    console.log(`Created data directory: ${CONFIG.dataDir}`);
}

// Track condition assignments for balanced randomization
let conditionCounts = {};

function loadConditionCounts() {
    const countFile = path.join(CONFIG.dataDir, 'condition_counts.json');
    if (fs.existsSync(countFile)) {
        conditionCounts = JSON.parse(fs.readFileSync(countFile, 'utf8'));
    } else {
        // Initialize counts
        for (const [expName, expConfig] of Object.entries(CONFIG.experiments)) {
            conditionCounts[expName] = {};
            for (const cond of expConfig.conditions) {
                conditionCounts[expName][cond] = 0;
            }
        }
    }
}

function saveConditionCounts() {
    const countFile = path.join(CONFIG.dataDir, 'condition_counts.json');
    // Write to a tmp file then rename, so a crash mid-write can't leave
    // condition_counts.json in a half-written / unparseable state.
    const tmpFile = `${countFile}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(conditionCounts, null, 2));
    fs.renameSync(tmpFile, countFile);
}

/** RFC-4180-ish CSV field escaping. */
function csvField(value) {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (/[",\r\n]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function csvRow(values) {
    return values.map(csvField).join(',') + '\n';
}

loadConditionCounts();

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        experiments: Object.keys(CONFIG.experiments)
    });
});

/**
 * GET /api/assign/:experiment
 * Assign participant to condition (balanced randomization)
 */
app.get('/api/assign/:experiment', (req, res) => {
    const experiment = req.params.experiment;

    if (!CONFIG.experiments[experiment]) {
        return res.status(400).json({
            error: `Unknown experiment: ${experiment}`
        });
    }

    const expConfig = CONFIG.experiments[experiment];
    const counts = conditionCounts[experiment];

    // Find condition with lowest count
    let minCount = Infinity;
    let candidates = [];

    for (const cond of expConfig.conditions) {
        const count = counts[cond] || 0;
        if (count < minCount) {
            minCount = count;
            candidates = [cond];
        } else if (count === minCount) {
            candidates.push(cond);
        }
    }

    // Random selection among tied conditions
    const assignedCondition = candidates[Math.floor(Math.random() * candidates.length)];

    // Generate participant ID
    const participantId = `${experiment.substring(0, 2).toUpperCase()}_${Date.now()}_${uuidv4().substring(0, 8)}`;

    // Update count
    conditionCounts[experiment][assignedCondition]++;
    saveConditionCounts();

    console.log(`Assigned ${participantId} to ${experiment}/${assignedCondition}`);

    res.json({
        participant_id: participantId,
        experiment: experiment,
        condition: assignedCondition,
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/save
 * Save participant data
 */
/** Allow only safe characters in participant IDs used as filenames. */
function sanitizeParticipantId(id) {
    return String(id).replace(/[^A-Za-z0-9_-]/g, '_');
}

app.post('/api/save', (req, res) => {
    const data = req.body;

    // Validate required fields
    if (!data.participant_id) {
        return res.status(400).json({ error: 'Missing participant_id' });
    }

    // Add server timestamp
    data.server_timestamp = new Date().toISOString();

    // Determine experiment type from participant ID or data
    let experiment = 'unknown';
    if (data.experiment) {
        experiment = data.experiment;
    } else if (data.participant_id.startsWith('TR')) {
        experiment = 'treasure_hunt';
    } else if (data.participant_id.startsWith('CA')) {
        experiment = 'career_choice';
    } else if (data.participant_id.startsWith('PA')) {
        experiment = 'pattern_memory';
    }

    // Create experiment subdirectory
    const expDir = path.join(CONFIG.dataDir, experiment);
    if (!fs.existsSync(expDir)) {
        fs.mkdirSync(expDir, { recursive: true });
    }

    // One file per participant. Each save (including incremental phase
    // snapshots) overwrites the same file via tmp + rename, so partial saves
    // never leave a corrupt JSON behind.
    const safeId = sanitizeParticipantId(data.participant_id);
    const filename = `${safeId}.json`;
    const filepath = path.join(expDir, filename);
    const tmpPath = `${filepath}.tmp`;

    try {
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
        fs.renameSync(tmpPath, filepath);
        console.log(`Saved data: ${filepath}`);

        res.json({
            success: true,
            message: 'Data saved successfully',
            filename: filename
        });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({
            error: 'Failed to save data',
            details: error.message
        });
    }
});

/**
 * GET /api/stats/:experiment
 * Get current data collection statistics
 */
app.get('/api/stats/:experiment', (req, res) => {
    const experiment = req.params.experiment;

    if (!CONFIG.experiments[experiment]) {
        return res.status(400).json({ error: `Unknown experiment: ${experiment}` });
    }

    const expConfig = CONFIG.experiments[experiment];
    const counts = conditionCounts[experiment] || {};

    const stats = {
        experiment: experiment,
        conditions: {},
        total: 0,
        target_total: expConfig.conditions.length * expConfig.targetN
    };

    for (const cond of expConfig.conditions) {
        const count = counts[cond] || 0;
        stats.conditions[cond] = {
            count: count,
            target: expConfig.targetN,
            progress: `${Math.round((count / expConfig.targetN) * 100)}%`
        };
        stats.total += count;
    }

    stats.overall_progress = `${Math.round((stats.total / stats.target_total) * 100)}%`;

    res.json(stats);
});

/**
 * GET /api/export/:experiment
 * Export data as CSV
 */
app.get('/api/export/:experiment', (req, res) => {
    const experiment = req.params.experiment;
    const expDir = path.join(CONFIG.dataDir, experiment);

    if (!fs.existsSync(expDir)) {
        return res.status(404).json({ error: 'No data found for this experiment' });
    }

    // Read all JSON files
    const files = fs.readdirSync(expDir).filter(f => f.endsWith('.json'));
    const data = files.map(f => {
        try {
            return JSON.parse(fs.readFileSync(path.join(expDir, f), 'utf8'));
        } catch {
            return null;
        }
    }).filter(d => d !== null);

    if (data.length === 0) {
        return res.status(404).json({ error: 'No valid data files found' });
    }

    // Convert to CSV (simplified - primary DVs only)
    let csv = '';

    if (experiment === 'treasure_hunt') {
        csv = csvRow([
            'participant_id', 'condition', 'total_coins',
            'extinction_chests_opened', 'extinction_quit_pressed',
            'start_time', 'end_time',
        ]);
        data.forEach(d => {
            csv += csvRow([
                d.participant_id,
                d.condition,
                d.total_coins,
                d.extinction_chests_opened ?? 0,
                d.extinction_quit_pressed ?? false,
                d.start_time,
                d.end_time,
            ]);
        });
    } else if (experiment === 'career_choice') {
        csv = csvRow(['participant_id', 'tenure_A', 'tenure_B', 'tenure_C', 'value_A', 'value_B', 'value_C']);
        data.forEach(d => {
            const resp = d.scenario_responses || {};
            csv += csvRow([
                d.participant_id,
                resp.A?.tenure, resp.B?.tenure, resp.C?.tenure,
                resp.A?.value, resp.B?.value, resp.C?.value,
            ]);
        });
    } else if (experiment === 'pattern_memory') {
        csv = csvRow(['participant_id', 'condition', 'expectation', 'pct_bet_ace', 'pattern_detected']);
        data.forEach(d => {
            csv += csvRow([
                d.participant_id,
                d.condition,
                d.expectation?.rating,
                d.betting?.summary?.pct_bet_ace_after_blank,
                d.memory_test?.pattern_detected,
            ]);
        });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${experiment}_data.csv`);
    res.send(csv);
});

// ============================================================================
// STATIC ROUTES FOR EXPERIMENTS
// ============================================================================

// Serve experiment pages
app.get('/experiment1', (req, res) => {
    res.sendFile(path.join(__dirname, '../experiment1_jspsych/index.html'));
});

// Experiment 2 (Career Choice) is intended for Qualtrics — see career_survey.py.
// Experiment 3 (Pattern Memory) currently only has the PsychoPy implementation.
// Web ports of these are not yet built; their routes are intentionally absent.

// Landing page
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Research Games - Experiment Portal</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 50px auto;
                    padding: 20px;
                    background: #f5f5f5;
                }
                h1 { color: #2c3e50; }
                .experiment-card {
                    background: white;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .experiment-card h2 { color: #3498db; margin-top: 0; }
                a.button {
                    display: inline-block;
                    background: #27ae60;
                    color: white;
                    padding: 10px 20px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin-right: 10px;
                }
                a.button:hover { background: #219a52; }
                .admin { background: #e74c3c; }
                .admin:hover { background: #c0392b; }
            </style>
        </head>
        <body>
            <h1>Research Games - Experiment Portal</h1>
            <p>Three experiments testing Festinger vs Capaldi theories of persistence.</p>

            <div class="experiment-card">
                <h2>Experiment 1: Digital Treasure Hunt</h2>
                <p>Open treasure chests to collect coins! (12-15 minutes)</p>
                <a href="/experiment1" class="button">Start Experiment</a>
                <a href="/api/stats/treasure_hunt" class="button admin">View Stats</a>
            </div>

            <div class="experiment-card">
                <h2>Experiment 2: Career Choice Study</h2>
                <p>Compare job offers with different recognition programs. (12 minutes)</p>
                <p style="color: #7f8c8d;"><em>Web version not yet built — deploy via Qualtrics. See <code>experiments/experiment2_career_choice/career_survey.py</code>.</em></p>
                <a href="/api/stats/career_choice" class="button admin">View Stats</a>
            </div>

            <div class="experiment-card">
                <h2>Experiment 3: Pattern Memory Challenge</h2>
                <p>Watch cards and test your expectations. (10 minutes)</p>
                <p style="color: #7f8c8d;"><em>Web version not yet built — run the PsychoPy script in <code>experiments/experiment3_pattern_memory/</code>.</em></p>
                <a href="/api/stats/pattern_memory" class="button admin">View Stats</a>
            </div>

            <hr style="margin: 40px 0;">

            <h3>API Endpoints</h3>
            <ul>
                <li><code>GET /api/health</code> - Health check</li>
                <li><code>GET /api/assign/:experiment</code> - Get condition assignment</li>
                <li><code>POST /api/save</code> - Save participant data</li>
                <li><code>GET /api/stats/:experiment</code> - Collection statistics</li>
                <li><code>GET /api/export/:experiment</code> - Download data as CSV</li>
            </ul>
        </body>
        </html>
    `);
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(CONFIG.port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  RESEARCH GAMES - EXPERIMENT SERVER                            ║
╠════════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${CONFIG.port}                   ║
║  Data directory: ${CONFIG.dataDir}
║                                                                ║
║  Experiments:                                                  ║
║    /experiment1 - Treasure Hunt                                ║
║    /experiment2 - Career Choice                                ║
║    /experiment3 - Pattern Memory                               ║
╚════════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
