/**
 * ============================================================================
 * API Client - Frontend Communication with Backend
 * ============================================================================
 */

const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost/api'
    : '/api';

const api = {
    /**
     * Record participant consent
     */
    async recordConsent(data) {
        try {
            const response = await fetch(`${API_BASE_URL}/consent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to record consent');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error - recordConsent:', error);
            throw error;
        }
    },

    /**
     * Get condition assignment
     */
    async getAssignment(experiment) {
        try {
            const response = await fetch(`${API_BASE_URL}/assign/${experiment}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to get assignment');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error - getAssignment:', error);
            throw error;
        }
    },

    /**
     * Save experiment data
     */
    async saveExperimentData(experimentId, data) {
        try {
            const response = await fetch(`${API_BASE_URL}/experiment/${experimentId}/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save data');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error - saveExperimentData:', error);
            // Fallback: save to localStorage
            this._saveToLocalStorage(experimentId, data);
            throw error;
        }
    },

    /**
     * Get collection statistics
     */
    async getStats(experiment) {
        try {
            const response = await fetch(`${API_BASE_URL}/stats/${experiment}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to get stats');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error - getStats:', error);
            throw error;
        }
    },

    /**
     * Check API health
     */
    async healthCheck() {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            return await response.json();
        } catch (error) {
            console.error('API Error - healthCheck:', error);
            return { status: 'error', error: error.message };
        }
    },

    /**
     * Admin login
     */
    async adminLogin(username, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error - adminLogin:', error);
            throw error;
        }
    },

    /**
     * Fallback: Save data to localStorage if API fails
     */
    _saveToLocalStorage(experimentId, data) {
        try {
            const key = `backup_exp${experimentId}_${data.participant_id}`;
            localStorage.setItem(key, JSON.stringify({
                timestamp: new Date().toISOString(),
                experimentId,
                data
            }));
            console.log('Data saved to localStorage as backup:', key);
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
}
