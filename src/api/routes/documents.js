const express = require('express');
const router = express.Router();
const { validateToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const DocumentController = require('../controllers/DocumentController');

router.use(validateToken);
router.use(rateLimit);

router.get('/:id', async (req, res, next) => {
  try {
    const controller = new DocumentController(req.user);
    const document = await controller.getDocument(req.params.id);
    res.json(document);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/download', async (req, res, next) => {
  try {
    const controller = new DocumentController(req.user);
    const stream = await controller.downloadDocument(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/export', async (req, res, next) => {
  try {
    const controller = new DocumentController(req.user);
    const result = await controller.exportToGoogleDrive(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;