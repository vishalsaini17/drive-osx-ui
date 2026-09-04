import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Folder, FileText, Link2, AlertCircle, Loader2 } from 'lucide-react';
import Wallpaper from '../desktop/Wallpaper';
import { useSystemStore } from '../state/systemStore';
import { FileService } from '../../platform/files/FileService';
import type { FileItemResponse } from '../../platform/files/FileService';

/**
 * Landing page for a public share link (`/s/:token`). Standalone, outside
 * the desktop shell, since the visitor may not be signed in — the resolve
 * call itself is public (CLAUDE.md §17), only opening the item requires auth.
 */
export default function ShareLinkPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useSystemStore((state) => state.isAuthenticated);
  const settings = useSystemStore((state) => state.settings);

  const [file, setFile] = useState<FileItemResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    FileService.resolveShareLink(token)
      .then((result) => {
        if (!cancelled) setFile(result.file);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'This link is no longer valid.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleOpen = () => {
    if (!file) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (file.type === 'folder') {
      navigate(`/folder/${file.id}`);
    } else {
      navigate('/folder');
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#06060c] font-sans antialiased text-white flex items-center justify-center">
      <Wallpaper settings={settings} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/90 backdrop-blur-xl shadow-2xl p-6 flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
          <Link2 className="w-6 h-6" />
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-2 py-4 text-sm text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            Checking link...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-2 py-2">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <h1 className="text-sm font-bold">Link not available</h1>
            <p className="text-xs text-zinc-400">{error}</p>
          </div>
        )}

        {!loading && !error && file && (
          <>
            <div className="flex flex-col items-center gap-2">
              {file.type === 'folder' ? (
                <Folder className="w-10 h-10 text-amber-400" />
              ) : (
                <FileText className="w-10 h-10 text-blue-400" />
              )}
              <h1 className="text-sm font-bold break-all">{file.name}</h1>
              <p className="text-xs text-zinc-400">
                Someone shared this {file.type} with you via a public link.
              </p>
            </div>

            <button
              onClick={handleOpen}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              {isAuthenticated ? `Open ${file.type === 'folder' ? 'Folder' : 'in Drive'}` : 'Sign In to Open'}
            </button>

            {!isAuthenticated && (
              <p className="text-[11px] text-zinc-500">
                You'll need an account to view this {file.type}.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
