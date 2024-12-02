const Apify = require('apify');
const SurferAPI = require('../core/SurferAPI');
const GoogleDriveUploader = require('../core/GoogleDriveUploader');
const ApifyHandlers = require('./handlers');

Apify.main(async () => {
    const input = await Apify.getInput();
    const {
        mode,
        documentId,
        destinationFolder,
        documents,
        rateLimiting = {}
    } = input;

    console.log('Initializing services...');
    
    const surferApi = new SurferAPI(process.env.SURFER_API_KEY, {
        maxConcurrent: rateLimiting.maxConcurrent || 2,
        requestsPerMinute: rateLimiting.requestsPerMinute || 30
    });

    const driveUploader = new GoogleDriveUploader(
        JSON.parse(process.env.GOOGLE_CREDENTIALS)
    );

    const handlers = new ApifyHandlers(surferApi, driveUploader);

    try {
        if (mode === 'single') {
            if (!documentId || !destinationFolder) {
                throw new Error('documentId and destinationFolder required for single mode');
            }
            await handlers.processDocument(documentId, destinationFolder);
        } else if (mode === 'batch') {
            if (!Array.isArray(documents)) {
                throw new Error('documents array required for batch mode');
            }
            await handlers.handleBatchProcess(documents);
        } else {
            throw new Error(`Invalid mode: ${mode}`);
        }
    } catch (error) {
        console.error('Actor failed:', error);
        throw error;
    }
});