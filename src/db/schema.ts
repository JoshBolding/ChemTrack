import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Product, Tote, ToteEvent, Unit, Job, ToteStatus } from '../types';

// idb's DBSchema indexes map index name → *field type*, not keypath name.
interface ChemTrackDB extends DBSchema {
  products: {
    key: string;
    value: Product;
  };
  units: {
    key: string;
    value: Unit;
    indexes: { 'by-active': string };
  };
  jobs: {
    key: string;
    value: Job;
    indexes: { 'by-active': string };
  };
  totes: {
    key: string;
    value: Tote;
    indexes: {
      'by-status': ToteStatus;
      'by-product': string;
    };
  };
  events: {
    key: string;
    value: ToteEvent;
    indexes: {
      'by-tote': string;
      'by-synced': string;
      'by-createdAt': string;
    };
  };
}

const DB_NAME = 'chemtrack';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ChemTrackDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<ChemTrackDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ChemTrackDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('units')) {
          const units = db.createObjectStore('units', { keyPath: 'id' });
          units.createIndex('by-active', 'active');
        }
        if (!db.objectStoreNames.contains('jobs')) {
          const jobs = db.createObjectStore('jobs', { keyPath: 'id' });
          jobs.createIndex('by-active', 'active');
        }
        if (!db.objectStoreNames.contains('totes')) {
          const totes = db.createObjectStore('totes', { keyPath: 'id' });
          totes.createIndex('by-status', 'status');
          totes.createIndex('by-product', 'productId');
        }
        if (!db.objectStoreNames.contains('events')) {
          const events = db.createObjectStore('events', { keyPath: 'id' });
          events.createIndex('by-tote', 'toteId');
          // idb's type generation for boolean indexes is fussy; cast to any.
          events.createIndex('by-synced', 'synced' as never);
          events.createIndex('by-createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

export type { ChemTrackDB };
