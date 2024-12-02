const Apify = require('apify');
const SurferAPI = require('./core/SurferAPI');
const GoogleDriveUploader = require('./core/GoogleDriveUploader');

Apify.main(async () => {
    const input = await Apify.getInput();
    const { documentId, destinationFolder } = input;

    console.log('Starting document processing...');
    
    try {
        const surferApi = new SurferAPI(process.env.SURFER_API_KEY);
        const driveUploader = new GoogleDriveUploader(
            JSON.parse(process.env.GOOGLE_CREDENTIALS)
        );

        // Download document
        const documentStream = await surferApi.downloadDocument(documentId);

        // Upload to Google Drive
        const uploadResult = await driveUploader.uploadFile(
            documentStream,
            `surfer-doc-${documentId}.pdf`,
            { destinationFolderId: destinationFolder }
        );

        await Apify.pushData({
            status: 'success',
            documentId,
            driveFileId: uploadResult.id,
            webViewLink: uploadResult.webViewLink
        });
    } catch (error) {
        console.error('Processing failed:', error);
        throw error;
    }
});