import { uploadPaths } from './upload.model';

describe('uploadPaths', () => {
  it('builds the Storage paths of an upload', () => {
    expect(uploadPaths.folder('k3x')).toBe('uploads/k3x/');
    expect(uploadPaths.source('k3x')).toBe('uploads/k3x/source');
  });
});
