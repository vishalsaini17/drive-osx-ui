import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, CloudOff, RefreshCw, X } from 'lucide-react';
import { platform } from '../../platform';
import type { SyncState } from '../../platform/offline/sync-engine';
import type { NetworkStatus } from '../../platform/offline/network';
import { stateColor } from '../../design-system/tokens';

/**
 * System-tray surface for offline and synchronisation state (CLAUDE.md §20).
 *
 * The user must always be able to tell whether their work was saved, what is
 * still queued, and what they can do about a failure — so pending and failed
 * operations are listed individually with retry and discard actions rather
 * than collapsed into a single toast.
 */
export default function SyncStatusIndicator() {
  const [sync, setSync] = useState<SyncState | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('online');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => platform.sync.subscribe(setSync), []);
  useEffect(() => platform.network.subscribe(setNetworkStatus), []);

  const pending = sync?.pending ?? 0;
  const failed = sync?.failed ?? 0;
  const isOffline = networkStatus !== 'online';

  // Nothing to report: stay out of the user's way.
  if (!isOffline && pending === 0 && failed === 0) return null;

  const summary = isOffline
    ? pending > 0
      ? `Offline — ${pending} change${pending === 1 ? '' : 's'} saved locally`
      : 'Offline'
    : failed > 0
      ? `${failed} change${failed === 1 ? '' : 's'} need attention`
      : `Syncing ${pending} change${pending === 1 ? '' : 's'}`;

  const indicatorColor = isOffline
    ? stateColor.offline
    : failed > 0
      ? stateColor.failed
      : stateColor.processing;

  return (
    <div className="fixed bottom-20 right-4 z-[800] max-w-sm">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-label={`Synchronisation status: ${summary}`}
        className="flex w-full items-center gap-2 rounded-lg bg-slate-900/90 px-3 py-2 text-left text-xs text-white shadow-lg backdrop-blur transition-colors hover:bg-slate-800/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        {isOffline ? (
          <CloudOff size={14} style={{ color: indicatorColor }} />
        ) : failed > 0 ? (
          <AlertTriangle size={14} style={{ color: indicatorColor }} />
        ) : (
          <RefreshCw size={14} className="animate-spin" style={{ color: indicatorColor }} />
        )}
        <span className="flex-1 truncate">{summary}</span>
      </button>

      {expanded && (
        <div className="mt-2 max-h-80 overflow-y-auto rounded-lg bg-slate-900/95 p-2 text-xs text-white shadow-xl backdrop-blur">
          {isOffline && (
            <p className="px-2 py-1.5 text-white/70">
              You are offline. Your changes are saved on this device and will be sent automatically when the
              connection returns.
            </p>
          )}

          {(sync?.operations ?? []).length === 0 && !isOffline && (
            <p className="px-2 py-1.5 text-white/70">Everything is up to date.</p>
          )}

          <ul className="space-y-1">
            {(sync?.operations ?? []).map((operation) => (
              <li key={operation.id} className="rounded-md bg-white/5 px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: stateColor[operation.status] }}
                  />
                  <span className="flex-1 truncate">{operation.label}</span>
                  <span className="text-white/50">{operation.status}</span>
                </div>

                {operation.lastError && (
                  <p className="mt-1 pl-4 text-[11px] text-white/60">{operation.lastError}</p>
                )}

                {operation.requiresAttention && (
                  <div className="mt-1.5 flex gap-2 pl-4">
                    <button
                      type="button"
                      onClick={() => void platform.sync.retry(operation.id)}
                      className="flex items-center gap-1 rounded bg-blue-500/20 px-2 py-1 text-[11px] text-blue-200 hover:bg-blue-500/30"
                    >
                      <RefreshCw size={11} /> Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => void platform.sync.discard(operation.id)}
                      className="flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[11px] text-white/70 hover:bg-white/20"
                    >
                      <X size={11} /> Discard
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {failed > 0 && (
            <button
              type="button"
              onClick={() => void platform.sync.retryAll()}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded bg-blue-500/20 px-2 py-1.5 text-[11px] text-blue-200 hover:bg-blue-500/30"
            >
              <RefreshCw size={11} /> Retry everything
            </button>
          )}

          {sync?.lastSyncedAt && (
            <p className="mt-2 flex items-center gap-1 px-2 text-[11px] text-white/50">
              <Check size={11} /> Last synced {new Date(sync.lastSyncedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
