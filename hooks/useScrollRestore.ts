import { useCallback, useEffect, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

export function useScrollRestore(isOpen: boolean, resetKey: number) {
  const listRef = useRef<any>(null);
  const scrollOffsetRef = useRef(0);
  const prevResetKeyRef = useRef(resetKey);

  // Restore scroll position when modal opens
  useEffect(() => {
    if (isOpen && scrollOffsetRef.current > 0) {
      const timeoutId = setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: scrollOffsetRef.current, animated: false });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Reset scroll when resetKey changes
  useEffect(() => {
    if (resetKey !== prevResetKeyRef.current) {
      prevResetKeyRef.current = resetKey;
      scrollOffsetRef.current = 0;
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [resetKey]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  return { listRef, onScroll };
}
