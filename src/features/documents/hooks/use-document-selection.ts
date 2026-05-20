"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Multi-row selection state used by the document table/grid + bulk action
 * bar. Kept dead simple: a Set of document IDs.
 */
export function useDocumentSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** Toggle all rows on the current page. */
  const toggleAll = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const ids = useMemo(() => Array.from(selected), [selected]);

  return {
    ids,
    count: selected.size,
    isSelected,
    toggle,
    toggleAll,
    clear,
  };
}
