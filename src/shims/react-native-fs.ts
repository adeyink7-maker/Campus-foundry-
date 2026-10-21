export const CachesDirectoryPath = '/tmp/cache';
export const DocumentDirectoryPath = '/tmp/documents';
export const exists = async (_path: string): Promise<boolean> => false;
export const mkdir = async (_path: string): Promise<void> => {};
export const readDir = async (_path: string): Promise<any[]> => [];
export const unlink = async (_path: string): Promise<void> => {};
export const downloadFile = (_options: any) => ({
  promise: Promise.resolve({ statusCode: 200, bytesWritten: 0 }),
  jobId: 1,
});

export default {
  CachesDirectoryPath,
  DocumentDirectoryPath,
  exists,
  mkdir,
  readDir,
  unlink,
  downloadFile,
};
