import { ApiError, request } from '../api/http';
import { localDatabase, STORES } from './database';
import { network } from './network';

/**
 * Sync engine (CLAUDE.md §19, §20).
 *
 * A user action updates local state immediately and enqueues an operation.
 * The queue is durable (IndexedDB), so a reload, a crash or a closed laptop
 * does not lose work. Operations are replayed in order when connectivity
 * returns; each carries an explicit state the UI can render.
 */
export type OperationState =
  | 'idle'
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed'
  | 'retrying'
  | 'offline';

export interface SyncOperation {
  id: string;
  /** Human-readable summary shown in the sync UI ("Upload report.pdf"). */
  label: string;
  /** Domain the operation belongs to, for grouping in the UI. */
  resource: 'file' | 'mail' | 'meeting' | 'other';
  resourceId?: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  status: OperationState;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
  /** Set when the server rejected the operation for good (4xx). */
  requiresAttention?: boolean;
}

export interface SyncState {
  status: 'idle' | 'syncing' | 'offline' | 'error';
  pending: number;
  failed: number;
  lastSyncedAt: string | null;
  operations: SyncOperation[];
}

type Listener = (state: SyncState) => void;

const listeners = new Set<Listener>();
let lastSyncedAt: string | null = null;
let draining = false;

function newId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readQueue(): Promise<SyncOperation[]> {
  if (!localDatabase.isSupported()) return [];
  const operations = await localDatabase.getAll<SyncOperation>(STORES.syncQueue);
  return operations.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function publish(): Promise<void> {
  const operations = await readQueue();
  const failed = operations.filter((operation) => operation.status === 'failed').length;
  const pending = operations.filter(
    (operation) => operation.status !== 'success' && operation.status !== 'failed',
  ).length;

  const status: SyncState['status'] = !network.isOnline()
    ? 'offline'
    : draining
      ? 'syncing'
      : failed > 0
        ? 'error'
        : 'idle';

  const state: SyncState = { status, pending, failed, lastSyncedAt, operations };
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch {
      // Never let a subscriber break the sync loop.
    }
  });
}

export interface EnqueueInput {
  label: string;
  resource: SyncOperation['resource'];
  resourceId?: string;
  method: SyncOperation['method'];
  path: string;
  body?: unknown;
  maxAttempts?: number;
}

/**
 * Records an operation to replay against the server. Returns the queued
 * operation so the caller can show its state next to the affected item.
 */
export async function enqueueOperation(input: EnqueueInput): Promise<SyncOperation> {
  const now = new Date().toISOString();
  const operation: SyncOperation = {
    id: newId(),
    label: input.label,
    resource: input.resource,
    ...(input.resourceId ? { resourceId: input.resourceId } : {}),
    method: input.method,
    path: input.path,
    body: input.body,
    status: network.isOnline() ? 'pending' : 'offline',
    attempts: 0,
    maxAttempts: input.maxAttempts ?? 5,
    createdAt: now,
    updatedAt: now,
  };

  await localDatabase.put(STORES.syncQueue, operation);
  await publish();

  if (network.isOnline()) {
    void drain();
  }

  return operation;
}

async function update(operation: SyncOperation, patch: Partial<SyncOperation>): Promise<SyncOperation> {
  const next = { ...operation, ...patch, updatedAt: new Date().toISOString() };
  await localDatabase.put(STORES.syncQueue, next);
  return next;
}

/**
 * Replays queued operations oldest-first. Ordering matters: a rename that
 * follows a create must not be sent first.
 */
export async function drain(): Promise<void> {
  if (draining || !localDatabase.isSupported()) return;
  if (!network.isOnline()) {
    await publish();
    return;
  }

  draining = true;
  await publish();

  try {
    const queue = await readQueue();

    for (const operation of queue) {
      if (operation.status === 'success' || operation.status === 'failed') continue;

      await update(operation, { status: 'processing' });
      await publish();

      try {
        await request(operation.path, { method: operation.method, body: operation.body });
        await localDatabase.delete(STORES.syncQueue, operation.id);
        lastSyncedAt = new Date().toISOString();
        network.reportReachable(true);
      } catch (error) {
        const apiError = error instanceof ApiError ? error : null;

        if (apiError?.isOffline) {
          // Stop the run: everything after this would fail the same way, and
          // sending later operations first would reorder the user's intent.
          await update(operation, { status: 'offline', lastError: apiError.message });
          network.reportReachable(false);
          break;
        }

        const attempts = operation.attempts + 1;
        const permanent = apiError ? !apiError.retryable : false;

        if (permanent || attempts >= operation.maxAttempts) {
          await update(operation, {
            status: 'failed',
            attempts,
            lastError: apiError?.message ?? String(error),
            requiresAttention: true,
          });
        } else {
          await update(operation, {
            status: 'retrying',
            attempts,
            lastError: apiError?.message ?? String(error),
          });
        }
      }

      await publish();
    }
  } finally {
    draining = false;
    await publish();
  }
}

/** Retry a single operation the user chose to re-run from the sync UI. */
export async function retryOperation(operationId: string): Promise<void> {
  const operation = await localDatabase.get<SyncOperation>(STORES.syncQueue, operationId);
  if (!operation) return;

  await update(operation, { status: 'pending', attempts: 0, requiresAttention: false });
  await drain();
}

/** Discard an operation the user decided not to keep. */
export async function discardOperation(operationId: string): Promise<void> {
  await localDatabase.delete(STORES.syncQueue, operationId);
  await publish();
}

export async function retryAll(): Promise<void> {
  const queue = await readQueue();
  await Promise.all(
    queue
      .filter((operation) => operation.status === 'failed' || operation.status === 'retrying')
      .map((operation) => update(operation, { status: 'pending', attempts: 0, requiresAttention: false })),
  );
  await drain();
}

export function subscribeToSync(listener: Listener): () => void {
  listeners.add(listener);
  void publish();
  return () => listeners.delete(listener);
}

export async function syncState(): Promise<SyncState> {
  const operations = await readQueue();
  return {
    status: !network.isOnline() ? 'offline' : draining ? 'syncing' : 'idle',
    pending: operations.filter((operation) => operation.status !== 'success' && operation.status !== 'failed')
      .length,
    failed: operations.filter((operation) => operation.status === 'failed').length,
    lastSyncedAt,
    operations,
  };
}

let started = false;

/** Starts replaying the queue and re-drains whenever connectivity returns. */
export function startSyncEngine(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  network.subscribe((status) => {
    if (status === 'online') void drain();
    else void publish();
  });

  // Retry periodically: a server that was down may come back without any
  // browser-visible network event.
  window.setInterval(() => {
    if (network.isOnline()) void drain();
  }, 30_000);

  void drain();
}
