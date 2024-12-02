const GoogleDriveUploader = require('../../src/core/GoogleDriveUploader');
const { Readable } = require('stream');

describe('GoogleDriveUploader', () => {
  let uploader;
  const mockCredentials = {
    client_email: 'test@test.com',
    private_key: 'test-key'
  };

  beforeEach(() => {
    uploader = new GoogleDriveUploader(mockCredentials);
  });

  it('should upload file successfully', async () => {
    const mockStream = new Readable();
    mockStream._read = () => {};
    mockStream.push('test content');
    mockStream.push(null);

    const result = await uploader.uploadFile(
      mockStream,
      'test.pdf'
    );

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('webViewLink');
  });

  it('should handle upload errors', async () => {
    const mockStream = new Readable();
    mockStream._read = () => {};
    mockStream.push('test content');
    mockStream.push(null);

    jest.spyOn(uploader.drive.files, 'create')
      .mockRejectedValue(new Error('Upload failed'));

    await expect(uploader.uploadFile(mockStream, 'test.pdf'))
      .rejects
      .toThrow('Upload failed');
  });
});