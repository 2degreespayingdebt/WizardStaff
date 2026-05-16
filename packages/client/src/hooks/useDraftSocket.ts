import { useEffect, useCallback, useState } from 'react';
import { draftSocket } from '../services/socket';
import type { DraftBoard, DraftPick, Draft } from '../types';

interface UseDraftSocketProps {
  draftId: string | null;
  enabled?: boolean;
}

export function useDraftSocket({ draftId, enabled = true }: UseDraftSocketProps) {
  const [board, setBoard] = useState<DraftBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draftId || !enabled) return;

    draftSocket.connect();

    draftSocket.onDraftState((newBoard) => {
      setBoard(newBoard);
      setLoading(false);
    });

    draftSocket.onPickMade(({ draft, pick }) => {
      setError(null);
      // State update comes via draft:state
    });

    draftSocket.onDraftPaused(({ draft }) => {
      setLoading(false);
    });

    draftSocket.onDraftResumed(({ draft }) => {
      setLoading(false);
    });

    draftSocket.onDraftError(({ error }) => {
      setError(error);
      setLoading(false);
    });

    draftSocket.joinDraft(draftId);

    return () => {
      draftSocket.offAll();
    };
  }, [draftId, enabled]);

  const makePick = useCallback(
    (teamId: string, playerId: string) => {
      if (!draftId) return;
      setLoading(true);
      setError(null);
      draftSocket.makePick(draftId, teamId, playerId);
    },
    [draftId]
  );

  const pauseDraft = useCallback(async () => {
    if (!draftId) return;
    setLoading(true);
    await fetch(`/api/drafts/${draftId}/pause`, { method: 'POST' });
  }, [draftId]);

  const resumeDraft = useCallback(async () => {
    if (!draftId) return;
    setLoading(true);
    await fetch(`/api/drafts/${draftId}/resume`, { method: 'POST' });
  }, [draftId]);

  return { board, loading, error, makePick, pauseDraft, resumeDraft };
}