const SurferAPI = require('../../src/core/SurferAPI');
const GoogleDriveUploader = require('../../src/core/GoogleDriveUploader');
const RateLimiter = require('../../src/core/RateLimiter');
const stream = require('stream');

jest.mock('../../src/core/SurferAPI');
jest.mock('../../src/core/GoogleDriveUploader');
jest.mock('../../src/core/RateLimiter');

describe('Integration: Document Processing Workflow', () => {
  let surferApi;
  let driveUploader;
  let rateLimiter;

  beforeEach(() => {
    surferApi = new SurferAPI('test-key');
    driveUploader = new GoogleDriveUploader({});
    rateLimiter = new RateLimiter();

    // Mock rate limiter to allow requests
    rateLimiter.checkLimit = jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 10
    });

    // Mock SurferAPI responses
    surferApi.getDocument = jest.fn().mockResolvedValue({
      id: 'doc-123',
      title: 'Test Document'
    });

    const mockReadable = new stream.Readable();
    mockReadable.push('test content');
    mockReadable.push(null);
    surferApi.downloadDocument = jest.fn().mockResolvedValue(mockReadable);

    // Mock Google Drive responses
    driveUploader.uploadFile = jest.fn().mockResolvedValue({
      id: 'gdrive-123',
      webViewLink: 'https://drive.google.com/file/123'
    });
  });

  test('should process document end-to-end', async () => {
    const documentId = 'test-doc-123';
    
    // Check rate limit
    const rateLimit = await rateLimiter.checkLimit('test-user');
    expect(rateLimit.allowed).toBe(true);

    // Get document metadata
    const metadata = await surferApi.getDocument(documentId);
    expect(metadata.id).toBe('doc-123');

    // Download document
    const documentStream = await surferApi.downloadDocument(documentId);
    expect(documentStream).toBeDefined();

    // Upload to Google Drive
    const uploadResult = await driveUploader.uploadFile(
      documentStream,
      `${metadata.title}.pdf`
    );

    expect(uploadResult.id).toBe('gdrive-123');
    expect(uploadResult.webViewLink).toBeDefined();
  });

  test('should handle rate limit exceeded', async () => {
    rateLimiter.checkLimit = jest.fn().mockResolvedValue({
      allowed: false,
      remaining: 0
    });

    const rateLimit = await rateLimiter.checkLimit('test-user');
    expect(rateLimit.allowed).toBe(false);
  });

  test('should handle document not found', async () => {
    surferApi.getDocument = jest.fn().mockRejectedValue(
      new Error('API Error: 404 - Document not found')
    );

    await expect(surferApi.getDocument('invalid-id'))
      .rejects
      .toThrow('Document not found');
  });
});