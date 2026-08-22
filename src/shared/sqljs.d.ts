declare module 'sql.js' {
  export class Database {
    constructor(data?: Uint8Array | ArrayBuffer | Buffer);
    exec(statement: string): Array<{ values: unknown[][] }>;
    run(statement: string, params?: unknown[]): void;
    export(): Uint8Array;
  }

  export interface InitSqlJsConfig {
    locateFile?: (fileName: string) => string;
  }

  export default function initSqlJs(config?: InitSqlJsConfig): Promise<{ Database: typeof Database }>;
}