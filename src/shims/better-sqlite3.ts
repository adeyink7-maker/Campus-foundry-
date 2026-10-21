/**
 * Browser / Web Shim for better-sqlite3
 * Prevents esbuild / bundler resolution errors when WatermelonDB node-sqlite adapter is analyzed.
 */

class DatabaseShim {
  constructor(_filename?: string, _options?: any) {}
  prepare(_sql: string) {
    return {
      run: () => ({ changes: 0, lastInsertRowid: 0 }),
      get: () => undefined,
      all: () => [],
      iterate: () => [][Symbol.iterator](),
    };
  }
  transaction(fn: any) {
    return fn;
  }
  pragma(_pragma: string) {}
  exec(_sql: string) {}
  close() {}
}

export default DatabaseShim;
export { DatabaseShim as Database };
