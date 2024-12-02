const Joi = require('joi');
const { metrics } = require('../monitoring/metrics');

const documentSchema = Joi.object({
  documentId: Joi.string().required(),
  options: Joi.object({
    fileName: Joi.string(),
    mimeType: Joi.string(),
    folderId: Joi.string()
  }).optional()
});

const validateDocument = async (req, res, next) => {
  try {
    await documentSchema.validateAsync(req.body);
    next();
  } catch (error) {
    metrics.errors.inc({ type: 'validation', code: 'invalid_input' });
    res.status(400).json({
      status: 'error',
      error: error.message
    });
  }
};

module.exports = { validateDocument };