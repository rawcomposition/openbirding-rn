import { useCallback, useEffect, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

export function useScrollRestore(isOpen: boolean, resetKey: number) {
  const listRef = useRef<any>(null);
  const scrollOffsetRef = useRef(0);
  const prevResetKeyRef = useRef(resetKey);
  const restoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingRestore = useCallback(() => {
    if (restoreTimeoutRef.current !== null) {
      clearTimeout(restoreTimeoutRef.current);
      restoreTimeoutRef.current = null;
    }
  }, []);

  // Restore scroll position when modal opens
  useEffect(() => {
    cancelPendingRestore();

    if (isOpen && scrollOffsetRef.current > 0) {
      restoreTimeoutRef.current = setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: scrollOffsetRef.current, animated: false });
        restoreTimeoutRef.current = null;
      }, 100);
    }

    return cancelPendingRestore;
  }, [cancelPendingRestore, isOpen]);

  // Reset scroll when resetKey changes
  useEffect(() => {
    if (resetKey !== prevResetKeyRef.current) {
      prevResetKeyRef.current = resetKey;
      scrollOffsetRef.current = 0;
      cancelPendingRestore();
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [cancelPendingRestore, resetKey]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  return { listRef, onScroll, cancelPendingRestore };
}
