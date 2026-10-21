export const configure = async (_config: any, _callback: any): Promise<number> => 2;
export const finish = (_taskId: string): void => {};
export const registerHeadlessTask = (_task: any): void => {};
export const status = async (): Promise<number> => 2;
export const start = async (): Promise<number> => 2;
export const stop = async (): Promise<number> => 2;

export const NETWORK_TYPE_NONE = 0;
export const NETWORK_TYPE_ANY = 1;
export const NETWORK_TYPE_UNMETERED = 2;
export const STATUS_RESTRICTED = 0;
export const STATUS_DENIED = 1;
export const STATUS_AVAILABLE = 2;

export default {
  configure,
  finish,
  registerHeadlessTask,
  status,
  start,
  stop,
  NETWORK_TYPE_NONE,
  NETWORK_TYPE_ANY,
  NETWORK_TYPE_UNMETERED,
  STATUS_RESTRICTED,
  STATUS_DENIED,
  STATUS_AVAILABLE,
};
