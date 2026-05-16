import { io, Socket } from 'socket.io-client';
import type { DraftBoard, DraftPick, Draft } from '../types';

type DraftEventCallback = (data: DraftBoard) => void;
type PickEventCallback = (data: { draft: Draft; pick: DraftPick }) => void;

class DraftSocket {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return;

    this.socket = io('/', {
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Draft socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Draft socket disconnected');
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinDraft(draftId: string) {
    this.socket?.emit('join:draft', draftId);
  }

  makePick(draftId: string, teamId: string, playerId: string) {
    this.socket?.emit('draft:pick', { draftId, teamId, playerId });
  }

  onDraftState(callback: DraftEventCallback) {
    this.socket?.on('draft:state', callback);
  }

  onPickMade(callback: PickEventCallback) {
    this.socket?.on('draft:pick:made', callback);
  }

  onDraftError(callback: (data: { error: string }) => void) {
    this.socket?.on('draft:error', callback);
  }

  onDraftPaused(callback: (data: { draft: Draft }) => void) {
    this.socket?.on('draft:paused', callback);
  }

  offAll() {
    this.socket?.off('draft:state');
    this.socket?.off('draft:pick:made');
    this.socket?.off('draft:error');
    this.socket?.off('draft:paused');
  }
}

export const draftSocket = new DraftSocket();