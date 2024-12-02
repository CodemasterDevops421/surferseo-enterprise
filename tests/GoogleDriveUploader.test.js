const GoogleDriveUploader = require('../src/core/GoogleDriveUploader');
const { google } = require('googleapis');
const stream = require('stream');

jest.mock('googleapis');

describe('GoogleDriveUploader', () => {
  let uploader;
  const mockCredentials = { client_email: 'test@test.com', private_key: 'key' };

  beforeEach(() => {
    google.auth.GoogleAuth = jest.fn().mockImplementation(() => ({
      getClient: jest.fn().mockResolvedValue({})
    }));
    
    google.drive = jest.fn().mockReturnValue({
      files: {
        create: jest.fn()
      }
    });

    uploader = new GoogleDriveUploader(mockCredentials);
  });

  describe('uploadFile', () => {
    test('should upload file successfully', async () => {
      const mockResponse = {
        data: {
          id: 'file-123',
          webViewLink: 'https://drive.google.com/file/123',
          size: '1000'
        }
      };

      google.drive().files.create.mockResolvedValue(mockResponse);

      const fileStream = new stream.Readable();
      const result = await uploader.uploadFile(fileStream, 'test.pdf');

      expect(result).toEqual(mockResponse.data);
      expect(google.drive().files.create).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: { name: 'test.pdf' },
          fields: 'id, webViewLink, size',
          supportsAllDrives: true
        })
      );
    });

    test('should handle upload errors', async () => {
      const errorMessage = 'Upload failed';
      google.drive().files.create.mockRejectedValue({
        response: {
          data: {
            error: {
              message: errorMessage
            }
          }
        }
      });

      const fileStream = new stream.Readable();
      await expect(uploader.uploadFile(fileStream, 'test.pdf'))
        .rejects
        .toThrow(`Google Drive API Error: ${errorMessage}`);
    });

    test('should handle network errors', async () => {
      const errorMessage = 'Network error';
      google.drive().files.create.mockRejectedValue(new Error(errorMessage));

      const fileStream = new stream.Readable();
      await expect(uploader.uploadFile(fileStream, 'test.pdf'))
        .rejects
        .toThrow(`Upload Error: ${errorMessage}`);
    });
  });
});