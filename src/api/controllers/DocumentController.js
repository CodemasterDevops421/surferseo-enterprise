const SurferAPI = require('../../core/SurferAPI');
const GoogleDriveUploader = require('../../core/GoogleDriveUploader');
const { documentQueue } = require('../../queues');
const metrics = require('../../monitoring/metrics');

class DocumentController {
  static async downloadDocument(req, res) {
    const { documentId } = req.body;
    const startTime = Date.now();

    try {
      const surferApi = new SurferAPI(process.env.SURFER_API_KEY);
      const document = await surferApi.downloadDocument(documentId);

      metrics.documentProcessingDuration.observe({
        operation: 'download'
      }, (Date.now() - startTime) / 1000);

      res.json({
        status: 'success',
        documentId,
        size: document.length
      });
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  static async processDocument(req, res) {
    const { documentId, destination } = req.body;

    try {
      // Add to processing queue
      const job = await documentQueue.add('processDocument', {
        documentId,
        destination,
        userId: req.user.id
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      });

      res.json({
        status: 'queued',
        jobId: job.id
      });
    } catch (error) {
      console.error('Queue error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to queue document processing'
      });
    }
  }

  static async getDocumentStatus(req, res) {
    const { id } = req.params;

    try {
      const job = await documentQueue.getJob(id);
      if (!job) {
        return res.status(404).json({
          status: 'error',
          message: 'Job not found'
        });
      }

      const state = await job.getState();
      const progress = job._progress;
      const result = job.returnvalue;

      res.json({
        status: state,
        progress,
        result
      });
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get document status'
      });
    }
  }
}

module.exports = DocumentController;