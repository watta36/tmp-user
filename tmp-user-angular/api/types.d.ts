// Minimal ambient declarations to allow compiling the API handlers without external type packages.
declare const process: { env: Record<string, string | undefined> };

declare module 'mongodb' {
  export class MongoClient {
    constructor(uri: string);
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
}
