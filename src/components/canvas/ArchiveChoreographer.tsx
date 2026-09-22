'use client';

import { useEffect, useRef } from 'react';
import { openFile, openLocker } from '@/lib/choreography';
import { useArchiveStore } from '@/store/archiveStore';

/**
 * Plays the "enter" sequences in response to selection.
 *
 * Exits are not here: closing has to finish animating *before* the state
 * changes (otherwise the tray would unmount mid-retract), so those are awaited
 * by `useBack()` and committed afterwards. Entering is the opposite — the
 * state change is what makes the tray exist in the first place — so it is
 * driven from an effect here.
 *
 * Rendered inside the Canvas so it mounts after the cabinet has registered its
 * pivots, and rendered *after* `<FileTray>` so the tray's layout effects have
 * already run by the time this passive effect fires.
 */
export function ArchiveChoreographer() {
  const selectedLocker = useArchiveStore((s) => s.selectedLocker);
  const selectedFile = useArchiveStore((s) => s.selectedFile);
  const previousLocker = useRef<string | null>(null);

  useEffect(() => {
    if (selectedLocker && selectedLocker !== previousLocker.current) {
      void openLocker(selectedLocker);
    }
    previousLocker.current = selectedLocker;
  }, [selectedLocker]);

  useEffect(() => {
    if (!selectedLocker || !selectedFile) return;
    void openFile(selectedLocker, selectedFile);
  }, [selectedLocker, selectedFile]);

  return null;
}
