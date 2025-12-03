// Minimal ambient declarations to allow compiling the API handlers without external type packages.
declare const process: { env: Record<string, string | undefined> };
declare const Buffer: {
  from(data: string, encoding?: string): { toString(encoding?: string): string };
};

declare module 'mongodb' {
  export interface MongoClientOptions {
    authSource?: string;
  }

  export class MongoClient {
    constructor(uri: string, options?: MongoClientOptions);
    connect(): Promise<void>;
    db(name?: string): Db;
  }

  export interface Db {
    collection<T>(name: string): Collection<T>;
  }

  export interface Collection<T> {
    find(filter: unknown): { sort(sort: unknown): { toArray(): Promise<(T & { _id?: unknown })[]> } };
    findOne(filter: unknown): Promise<(T & { _id?: unknown }) | null>;
    findOneAndUpdate(filter: unknown, update: unknown, options?: unknown): Promise<{ value?: (T & { _id?: unknown }) | null }>;
    deleteMany(filter: unknown): Promise<void>;
    insertMany(docs: T[]): Promise<void>;
  }

  export class ObjectId {}

  export class MongoServerError extends Error {
    codeName?: string;
    code?: number;
  }
}
