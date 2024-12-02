const SurferAPI = require('../src/core/SurferAPI');
const axios = require('axios');

jest.mock('axios');

describe('SurferAPI', () => {
  let surferApi;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    surferApi = new SurferAPI(mockApiKey);
    jest.clearAllMocks();
  });

  describe('getDocument', () => {
    test('should fetch document successfully', async () => {
      const mockDocument = { id: '123', content: 'test' };
      axios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: mockDocument })
      });

      const result = await surferApi.getDocument('123');
      expect(result).toEqual(mockDocument);
    });

    test('should handle API errors', async () => {
      const errorMessage = 'API Error';
      axios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue({
          response: {
            status: 404,
            data: { message: errorMessage }
          }
        })
      });

      await expect(surferApi.getDocument('123')).rejects.toThrow(`API Error: 404 - ${errorMessage}`);
    });

    test('should handle network errors', async () => {
      const errorMessage = 'Network Error';
      axios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue({
          request: {},
          message: errorMessage
        })
      });

      await expect(surferApi.getDocument('123')).rejects.toThrow(`Network Error: ${errorMessage}`);
    });
  });

  describe('downloadDocument', () => {
    test('should download document as stream', async () => {
      const mockStream = { pipe: jest.fn() };
      axios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: mockStream })
      });

      const result = await surferApi.downloadDocument('123');
      expect(result).toBe(mockStream);
    });

    test('should handle download errors', async () => {
      const errorMessage = 'Download Failed';
      axios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error(errorMessage))
      });

      await expect(surferApi.downloadDocument('123')).rejects.toThrow();
    });
  });
});