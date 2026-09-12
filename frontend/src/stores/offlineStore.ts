/**
 * Offline Store using IndexedDB for SmartForge PWA (RNF-03, DT-04).
 * Stores active routine, local sessions, check-ins, set logs, pain reports, and sync queue.
 */

export interface ExercisePlanItem {
  assignmentId: string;
  exerciseId: string;
  name: string;
  setsTarget: number;
  repsTargetMin: number;
  repsTargetMax: number;
  loadKg: number;
}

export interface DailyRoutinePlan {
  id: string; // session_plan_id
  dayOfWeek: number;
  weekNumber: number;
  isDeload: boolean;
  exercises: ExercisePlanItem[];
}

export interface LocalSession {
  id: string;
  sessionPlanId: string;
  athleteId?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'abandoned';
  startedAt?: string;
  completedAt?: string;
  clientTimestamp: string;
  synced: boolean;
}

export interface LocalPainItem {
  joint: string;
  side: 'left' | 'right' | 'bilateral' | 'izquierda' | 'derecha';
  intensity: 'mild' | 'moderate' | 'severe' | 'leve' | 'moderada' | 'severa';
}

export interface LocalCheckIn {
  id: string;
  sessionId: string;
  fatigueLevel: number; // 1-5
  pains: LocalPainItem[];
  createdAt: string;
  synced: boolean;
}

export interface LocalSetLog {
  id: string;
  sessionId: string;
  exerciseAssignmentId: string;
  setNumber: number;
  weightKg: number;
  repsCompleted: number;
  rir: number;
  clientTimestamp: string;
  createdAt: string;
  synced: boolean;
}

export interface LocalPainReport {
  id: string;
  sessionId: string;
  exerciseAssignmentId: string;
  joint: string;
  side: 'left' | 'right' | 'bilateral' | 'izquierda' | 'derecha';
  intensity: 'mild' | 'moderate' | 'severe' | 'leve' | 'moderada' | 'severa';
  createdAt: string;
  synced: boolean;
}

export interface SyncQueueItem {
  id: string;
  sequenceNumber?: number;
  entityType: 'session' | 'checkin' | 'set_log' | 'pain_report';
  action: 'create' | 'update' | 'delete';
  payload: unknown;
  clientTimestamp: string;
  createdAt: string;
  status: 'pending' | 'synced' | 'failed';
  attempts?: number;
}

let syncSequenceCounter = 0;

const DB_NAME = 'smartforge_offline_db';
const DB_VERSION = 1;

class OfflineStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Daily Routine
        if (!db.objectStoreNames.contains('routine')) {
          db.createObjectStore('routine', { keyPath: 'id' });
        }

        // Sessions
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }

        // Checkins
        if (!db.objectStoreNames.contains('checkins')) {
          const store = db.createObjectStore('checkins', { keyPath: 'id' });
          store.createIndex('by_session', 'sessionId', { unique: false });
        }

        // Set Logs
        if (!db.objectStoreNames.contains('set_logs')) {
          const store = db.createObjectStore('set_logs', { keyPath: 'id' });
          store.createIndex('by_session', 'sessionId', { unique: false });
        }

        // Pain Reports
        if (!db.objectStoreNames.contains('pain_reports')) {
          const store = db.createObjectStore('pain_reports', { keyPath: 'id' });
          store.createIndex('by_session', 'sessionId', { unique: false });
        }

        // Sync Queue
        if (!db.objectStoreNames.contains('sync_queue')) {
          const store = db.createObjectStore('sync_queue', { keyPath: 'id' });
          store.createIndex('by_status', 'status', { unique: false });
          store.createIndex('by_created', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // --- Daily Routine Plan ---
  async saveRoutine(routine: DailyRoutinePlan): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('routine', 'readwrite');
      const store = tx.objectStore('routine');
      store.put(routine);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getRoutine(): Promise<DailyRoutinePlan | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('routine', 'readonly');
      const store = tx.objectStore('routine');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result as DailyRoutinePlan[];
        resolve(list.length > 0 && list[0] ? list[0] : null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- Sessions ---
  async saveSession(session: LocalSession): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      store.put(session);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getSession(sessionId: string): Promise<LocalSession | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const req = store.get(sessionId);
      req.onsuccess = () => resolve((req.result as LocalSession) || null);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Check-Ins ---
  async saveCheckIn(checkin: LocalCheckIn): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('checkins', 'readwrite');
      const store = tx.objectStore('checkins');
      store.put(checkin);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCheckIn(sessionId: string): Promise<LocalCheckIn | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('checkins', 'readonly');
      const store = tx.objectStore('checkins');
      const index = store.index('by_session');
      const req = index.getAll(sessionId);
      req.onsuccess = () => {
        const results = req.result as LocalCheckIn[];
        resolve(results.length > 0 && results[0] ? results[0] : null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- Set Logs ---
  async saveSetLog(setLog: LocalSetLog): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('set_logs', 'readwrite');
      const store = tx.objectStore('set_logs');
      store.put(setLog);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getSetLogs(sessionId: string): Promise<LocalSetLog[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('set_logs', 'readonly');
      const store = tx.objectStore('set_logs');
      const index = store.index('by_session');
      const req = index.getAll(sessionId);
      req.onsuccess = () => {
        const results = (req.result as LocalSetLog[]) || [];
        // Sort by setNumber ascending
        results.sort((a, b) => a.setNumber - b.setNumber);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteSetLog(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('set_logs', 'readwrite');
      const store = tx.objectStore('set_logs');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Pain Reports ---
  async savePainReport(report: LocalPainReport): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pain_reports', 'readwrite');
      const store = tx.objectStore('pain_reports');
      store.put(report);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPainReports(sessionId: string): Promise<LocalPainReport[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pain_reports', 'readonly');
      const store = tx.objectStore('pain_reports');
      const index = store.index('by_session');
      const req = index.getAll(sessionId);
      req.onsuccess = () => resolve((req.result as LocalPainReport[]) || []);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Sync Queue (DT-04, DT-10) ---
  async enqueueSync(
    item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'status' | 'sequenceNumber'> & { status?: SyncQueueItem['status'] }
  ): Promise<string> {
    const db = await this.getDB();
    syncSequenceCounter += 1;
    const id = `sync_${Date.now()}_${syncSequenceCounter}_${Math.random().toString(36).substring(2, 7)}`;
    const syncItem: SyncQueueItem = {
      id,
      sequenceNumber: syncSequenceCounter,
      entityType: item.entityType,
      action: item.action,
      payload: item.payload,
      clientTimestamp: item.clientTimestamp,
      createdAt: new Date().toISOString(),
      status: item.status || 'pending',
      attempts: 0
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      store.put(syncItem);
      tx.oncomplete = () => resolve(id);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPendingSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const req = store.getAll();
      req.onsuccess = () => {
        const results = (req.result as SyncQueueItem[]) || [];
        const pending = results.filter((item) => item.status === 'pending');
        // Sort FIFO by sequenceNumber or createdAt
        pending.sort((a, b) => {
          if (a.sequenceNumber !== undefined && b.sequenceNumber !== undefined) {
            return a.sequenceNumber - b.sequenceNumber;
          }
          return a.createdAt < b.createdAt ? -1 : 1;
        });
        resolve(pending);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async markSyncItemProcessed(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Reset / Purge ---
  async clearAllOfflineData(): Promise<void> {
    const db = await this.getDB();
    const storeNames = ['routine', 'sessions', 'checkins', 'set_logs', 'pain_reports', 'sync_queue'];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, 'readwrite');
      storeNames.forEach((name) => {
        tx.objectStore(name).clear();
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const offlineStore = new OfflineStore();
