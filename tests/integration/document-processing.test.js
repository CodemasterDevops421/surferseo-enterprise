const request = require('supertest');
const app = require('../../src/app');
const SurferAPI = require('../../src/core/SurferAPI');
const GoogleDriveUploader = require('../../src/core/GoogleDriveUploader');
const { Readable } = require('stream');

describe('Document Processing', () => {
  let mockDocument;
  let mockStream;

  beforeEach(() => {
    mockDocument = {
      id: 'test-123',
      title: 'Test Document'
    };

    mockStream = new Readable();
    mockStream._read = () => {};
    mockStream.push('test content');
    mockStream.push(null);

    // Mock SurferAPI
    SurferAPI.prototype.getDocument = jest.fn().mockResolvedValue(mockDocument);
    SurferAPI.prototype.downloadDocument = jest.fn().mockResolvedValue(mockStream);

    // Mock Google Drive
    GoogleDriveUploader.prototype.uploadFile = jest.fn().mockResolvedValue({
      id: 'gdrive-123',
      webViewLink: 'https://drive.google.com/file/123'
    });
  });

  it('should process document successfully', async () => {
    const response = await request(app)
      .post('/api/v1/documents/process')
      .set('X-API-Key', 'test-key')
      .send({
        documentId: 'test-123',
        destination: 'test-folder'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'queued');
    expect(response.body).toHaveProperty('jobId');
  });

  it('should handle rate limiting', async () => {
    // Make multiple requests to trigger rate limit
    const requests = Array(11).fill().map(() =>
      request(app)
        .post('/api/v1/documents/process')
        .set('X-API-Key', 'test-key')
        .send({
          documentId: 'test-123',
          destination: 'test-folder'
        })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.some(res => res.status === 429);
    expect(rateLimited).toBe(true);
  });

  it('should handle API errors gracefully', async () => {
    SurferAPI.prototype.getDocument = jest.fn().mockRejectedValue(
      new Error('API Error')
    );

    const response = await request(app)
      .post('/api/v1/documents/process')
      .set('X-API-Key', 'test-key')
      .send({
        documentId: 'test-123',
        destination: 'test-folder'
      });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('status', 'error');
  });

  it('should validate input parameters', async () => {
    const response = await request(app)
      .post('/api/v1/documents/process')
      .set('X-API-Key', 'test-key')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('status', 'error');
  });
});