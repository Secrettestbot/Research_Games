# API Contract - Frontend ↔ Backend Integration

## Base URL
- Development: `http://localhost/api`
- Production: `https://yourdomain.com/api`

## Authentication
- Admin endpoints require JWT token in `Authorization: Bearer <token>` header
- Participant endpoints are public (no auth required)

## Endpoints

### 1. Health Check
```http
GET /api/health
```

**Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2026-01-27T18:00:00.000Z",
  "database": "connected"
}
```

---

### 2. Record Consent
```http
POST /api/consent
```

**Request Body**:
```json
{
  "experiment_type": "treasure_hunt" | "career_choice" | "pattern_memory",
  "consent_given": true,
  "user_agent": "Mozilla/5.0...",
  "ip_address": "192.168.1.1"
}
```

**Response** (201):
```json
{
  "success": true,
  "participant_id": "TH_1738003200000_a1b2c3d4",
  "timestamp": "2026-01-27T18:00:00.000Z"
}
```

---

### 3. Get Condition Assignment
```http
GET /api/assign/:experiment
```

**Parameters**:
- `:experiment` = `treasure_hunt`, `career_choice`, or `pattern_memory`

**Response** (200):
```json
{
  "participant_id": "TH_1738003200000_a1b2c3d4",
  "experiment": "treasure_hunt",
  "condition": "HIGH_EFFORT",
  "timestamp": "2026-01-27T18:00:00.000Z"
}
```

**Conditions by Experiment**:
- **treasure_hunt**: `BASELINE`, `HIGH_EFFORT`, `NR_PATTERN`, `RN_PATTERN`
- **career_choice**: `WITHIN_SUBJECTS` (all participants see all 3 scenarios)
- **pattern_memory**: `NR_PATTERN`, `RANDOM`

---

### 4. Save Experiment Data
```http
POST /api/experiment/:id/save
```

**Parameters**:
- `:id` = experiment type (`1`, `2`, or `3`)

**Request Body - Experiment 1 (Treasure Hunt)**:
```json
{
  "participant_id": "TH_1738003200000_a1b2c3d4",
  "condition": "HIGH_EFFORT",
  "total_coins": 45,
  "extinction_chests_opened": 12,
  "practice_trials": [...],
  "acquisition_trials": [...],
  "extinction_trials": [...],
  "survey_responses": {...},
  "start_time": "2026-01-27T18:00:00.000Z",
  "end_time": "2026-01-27T18:15:00.000Z",
  "completion_code": "a1b2c3d4"
}
```

**Request Body - Experiment 2 (Career Choice)**:
```json
{
  "participant_id": "CC_1738003200000_x1y2z3",
  "scenario_order": ["A", "C", "B"],
  "scenario_responses": {
    "A": {
      "tenure_intention_months": 18,
      "recognition_value_rating": 75,
      "attractiveness_rating": 5,
      "salary_equivalent": 10000
    },
    "B": {...},
    "C": {...}
  },
  "manipulation_checks": {...},
  "mechanism_data": {...},
  "demographics": {...},
  "digit_span_score": 7,
  "start_time": "2026-01-27T18:00:00.000Z",
  "end_time": "2026-01-27T18:12:00.000Z",
  "completion_code": "x1y2z3"
}
```

**Request Body - Experiment 3 (Pattern Memory)**:
```json
{
  "participant_id": "PM_1738003200000_p1q2r3",
  "condition": "NR_PATTERN",
  "card_sequence": [0,1,0,1,...],
  "expectation_rating": 6,
  "betting_summary": {
    "n_blank_trials": 10,
    "n_bet_ace_after_blank": 8,
    "pct_bet_ace_after_blank": 0.80
  },
  "memory_test_data": {...},
  "betting_trials": [...],
  "mechanism_data": {...},
  "digit_span_score": 6,
  "start_time": "2026-01-27T18:00:00.000Z",
  "end_time": "2026-01-27T18:10:00.000Z",
  "completion_code": "p1q2r3"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Data saved successfully",
  "participant_id": "TH_1738003200000_a1b2c3d4"
}
```

---

### 5. Get Collection Statistics
```http
GET /api/stats/:experiment
```

**Parameters**:
- `:experiment` = `treasure_hunt`, `career_choice`, or `pattern_memory`

**Response** (200):
```json
{
  "experiment": "treasure_hunt",
  "conditions": {
    "BASELINE": {
      "count": 45,
      "target": 80,
      "progress": "56%"
    },
    "HIGH_EFFORT": {...},
    "NR_PATTERN": {...},
    "RN_PATTERN": {...}
  },
  "total": 180,
  "target_total": 320,
  "overall_progress": "56%"
}
```

---

### 6. Export Data
```http
GET /api/export/:experiment/:format
```

**Parameters**:
- `:experiment` = `treasure_hunt`, `career_choice`, or `pattern_memory`
- `:format` = `csv` or `json`

**Response** (200):
- Content-Type: `text/csv` or `application/json`
- Content-Disposition: `attachment; filename="treasure_hunt_data.csv"`

**CSV Format (for R analysis)**:
```csv
participant_id,condition,total_coins,extinction_chests,start_time,end_time
TH_1738003200000_a1b2c3d4,HIGH_EFFORT,45,12,2026-01-27T18:00:00Z,2026-01-27T18:15:00Z
```

---

### 7. Admin Login
```http
POST /api/admin/login
```

**Request Body**:
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

---

## Error Responses

**400 Bad Request**:
```json
{
  "error": "Validation error",
  "details": "Missing required field: participant_id"
}
```

**404 Not Found**:
```json
{
  "error": "Participant not found"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Database error",
  "message": "Connection refused"
}
```

---

## Data Validation Rules

### Experiment 1 (Treasure Hunt)
- `participant_id`: Required, string, matches pattern `TH_*`
- `condition`: Required, enum: `BASELINE`, `HIGH_EFFORT`, `NR_PATTERN`, `RN_PATTERN`
- `extinction_chests_opened`: **PRIMARY DV**, required, integer, 0-30
- `total_coins`: Required, integer, >= 0

### Experiment 2 (Career Choice)
- `participant_id`: Required, string, matches pattern `CC_*`
- `scenario_responses.*.tenure_intention_months`: **PRIMARY DV**, required, integer, 0-24
- `scenario_responses.*.recognition_value_rating`: **PRIMARY DV**, required, integer, 0-100
- `digit_span_score`: Required, integer, 0-12

### Experiment 3 (Pattern Memory)
- `participant_id`: Required, string, matches pattern `PM_*`
- `condition`: Required, enum: `NR_PATTERN`, `RANDOM`
- `expectation_rating`: **PRIMARY DV**, required, integer, 1-7
- `betting_summary.pct_bet_ace_after_blank`: **PRIMARY DV**, required, float, 0.0-1.0

---

## CORS Configuration
- Allow-Origin: Configured via `CORS_ORIGIN` environment variable
- Allow-Methods: `GET, POST, PUT, DELETE, OPTIONS`
- Allow-Headers: `Content-Type, Authorization`

---

## Rate Limiting
- 100 requests per minute per IP for participant endpoints
- 1000 requests per minute for admin endpoints (with valid JWT)
