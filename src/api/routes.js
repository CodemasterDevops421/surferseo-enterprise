const express = require('express');
const { validateDocument } = require('../middleware/validation');
const { rateLimiter } = require('../middleware/rateLimiter');
const { authenticateRequest } = require('../middleware/auth');
const { metrics } = require('../monitoring/metrics');

const router = express.Router();

// Health check endpoints
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

router.get('/ready', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

// Metrics endpoint
router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Document processing endpoints
router.post('/documents/process',
  authenticateRequest,
  rateLimiter,
  validateDocument,
  async (req, res) => {
    const startTime = Date.now();
    try {
      const { documentId } = req.body;
      const timer = metrics.documentProcessingDuration.startTimer();

      // Get document metadata
      const document = await surferApi.getDocument(documentId);

      // Download document
      const documentStream = await surferApi.downloadDocument(documentId);

      // Upload to Google Drive
      const uploadResult = await driveUploader.uploadFile(
        documentStream,
        `${document.title}.pdf`
      );

      timer({ operation: 'complete' });
      metrics.uploadSize.observe(uploadResult.size);

      res.json({
        status: 'success',
        data: {
          documentId: document.id,
          title: document.title,
          driveId: uploadResult.id,
          driveLink: uploadResult.webViewLink
        }
      });
    } catch (error) {
      metrics.errors.inc({ type: 'document_processing', code: error.code || 'unknown' });
      res.status(500).json({
        status: 'error',
        error: error.message
      });
    } finally {
      metrics.requestDuration.observe({
        method: 'POST',
        route: '/documents/process',
        status_code: res.statusCode
      }, (Date.now() - startTime) / 1000);
    }
});

module.exports = router;