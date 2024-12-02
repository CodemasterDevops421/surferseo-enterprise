const express = require('express');
const { validateApiKey, rateLimiter } = require('../middleware');
const DocumentController = require('../controllers/DocumentController');
const MetricsController = require('../controllers/MetricsController');

const router = express.Router();

// Health check endpoints
router.get('/health', (req, res) => res.status(200).json({ status: 'healthy' }));
router.get('/ready', (req, res) => res.status(200).json({ status: 'ready' }));

// Metrics endpoint
router.get('/metrics', MetricsController.getMetrics);

// API endpoints with authentication and rate limiting
router.use(validateApiKey);
router.use(rateLimiter);

// Document operations
router.post('/documents/download', DocumentController.downloadDocument);
router.post('/documents/process', DocumentController.processDocument);
router.get('/documents/:id/status', DocumentController.getDocumentStatus);

module.exports = router;