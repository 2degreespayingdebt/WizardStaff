import { useEffect, useCallback, useState } from 'react';
import type { DraftBoard } from '../types';

interface UseDraftSocketProps {
  draftId: string | null;
  enabled?: boolean;
}

export function useDraftSocket({ draftId, enabled = true }: UseDraftSocketProps) {
  const [board, setBoard] = useState<DraftBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const getToken = () => localStorage.getItem('wizardstaff_token');

  const fetchBoard = useCallback(async (): Promise<DraftBoard | null> => {
    const token = getToken();
    const res = await fetch(`/api/drafts/${draftId}/board`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }, [draftId]);

  // Poll for board updates every 2 seconds
  useEffect(() => {
    if (!draftId || !enabled) return;

    let cancelled = false;
    let pollCount = 0;

    async function poll() {
      pollCount++;
      try {
        const data = await fetchBoard();
        if (!cancelled) {
          setBoard(data);
          setError(null);
          setInitialized(true);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
          // Mark initialized even on failure so we don't spin forever
          if (pollCount >= 1) setInitialized(true);
        }
      }
    }

    // Kick off immediately, then every 2s
    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [draftId, enabled, fetchBoard]);

  // Set loading true when starting a mutation
  const withMutate = useCallback(
    (fn: () => Promise<void>) => async () => {
      setLoading(true);
      setError(null);
      try {
        await fn();
        const data = await fetchBoard();
        setBoard(data);
        setInitialized(true);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [fetchBoard]
  );

  const makePick = useCallback(
    async (teamId: string, playerId: string) => {
      if (!draftId) return;
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const res = await fetch(`/api/drafts/${draftId}/pick`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ teamId, playerId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Pick failed' }));
          throw new Error(err.error || 'Pick failed');
        }
        const data = await fetchBoard();
        setBoard(data);
        setInitialized(true);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [draftId, fetchBoard]
  );

  const pauseDraft = useCallback(
    async () => {
      if (!draftId) return;
      setLoading(true);
      try {
        const token = getToken();
        await fetch(`/api/drafts/${draftId}/pause`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await fetchBoard();
        setBoard(data);
        setInitialized(true);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [draftId, fetchBoard]
  );

  const resumeDraft = useCallback(
    async () => {
      if (!draftId) return;
      setLoading(true);
      try {
        const token = getToken();
        await fetch(`/api/drafts/${draftId}/resume`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await fetchBoard();
        setBoard(data);
        setInitialized(true);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [draftId, fetchBoard]
  );

  const startDraft = useCallback(
    async () => {
      if (!draftId) return;
      setLoading(true);
      try {
        const token = getToken();
        await fetch(`/api/drafts/${draftId}/start`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await fetchBoard();
        setBoard(data);
        setInitialized(true);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [draftId, fetchBoard]
  );

  const undoPick = useCallback(
    async () => {
      if (!draftId) return;
      setLoading(true);
      try {
        const token = getToken();
        await fetch(`/api/drafts/${draftId}/undo`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await fetchBoard();
        setBoard(data);
        setInitialized(true);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [draftId, fetchBoard]
  );

  return {
    board,
    loading,
    error,
    makePick,
    pauseDraft,
    resumeDraft,
    undoPick,
    startDraft,
    initialized,
  };
}