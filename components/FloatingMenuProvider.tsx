import { HeaderHeightContext } from "@react-navigation/elements";
import React, { createContext, ReactNode, RefObject, useCallback, useContext, useMemo, useRef, useState } from "react";
import { StyleProp, TouchableOpacity, TouchableOpacityProps, useWindowDimensions, View, ViewStyle } from "react-native";
import { PopoverMode, PopoverPlacement, Rect } from "react-native-popover-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FloatingMenu, { FloatingMenuAnchor, FloatingMenuSection } from "./FloatingMenu";

type FloatingMenuState = {
  sections: FloatingMenuSection[];
  from: FloatingMenuAnchor;
  placement: PopoverPlacement;
};

type FloatingMenuContextValue = {
  openMenu: (
    sections: FloatingMenuSection[],
    from: RefObject<View>,
    options?: { placementOverride?: PopoverPlacement }
  ) => void;
  closeMenu: () => void;
};

type FloatingMenuInternalContextValue = FloatingMenuContextValue & {
  menu: FloatingMenuState | null;
};

type FloatingMenuProviderProps = {
  children: ReactNode;
  placementOverride?: PopoverPlacement;
};

type FloatingMenuHostProps = {
  width?: number;
  /**
   * Popover rendering mode. Defaults to JS_MODAL (required inside a bottom sheet, where a native
   * modal-in-modal misbehaves). Full-screen pages should pass RN_MODAL so the backdrop and shadow
   * overlay the whole window, including the navigation header.
   */
  mode?: PopoverMode;
  /** Gap between the trigger and the popover, in px. */
  offset?: number;
};

type FloatingMenuTriggerProps = {
  sections: FloatingMenuSection[];
  children: ReactNode;
  touchableStyle?: StyleProp<ViewStyle>;
  placementOverride?: PopoverPlacement;
  onBeforeOpen?: () => Promise<void> | void;
} & Pick<TouchableOpacityProps, "activeOpacity" | "disabled">;

const MENU_EDGE_MARGIN = 12;
const MENU_ROW_ESTIMATED_HEIGHT = 48;
const MENU_VERTICAL_PADDING = 8;
const MENU_SECTION_SEPARATOR_HEIGHT = 9;

const FloatingMenuContext = createContext<FloatingMenuInternalContextValue | null>(null);

/**
 * A native header lays its children out in the strip *above* the screen content even though
 * UIKit draws them over it, so a trigger in the header measures at a negative window y, short by
 * exactly the header's height (software-mansion/react-native-screens#2539). Nothing else can
 * report a negative y — a trigger the user just tapped is on screen — so a negative y both
 * identifies a header trigger and tells us how to correct it.
 *
 * Returns the trigger's real window rect, or null when the measurement needed no correction.
 * Popover re-measures a ref itself, so a header trigger has to be handed a fixed rect; everything
 * else keeps passing the ref, since Popover's ref path is also what compensates for the container
 * offset of a menu hosted inside a bottom sheet.
 */
function getHeaderTriggerRect(measured: { x: number; y: number; width: number; height: number }, headerHeight: number) {
  if (measured.y >= 0) return null;
  return new Rect(measured.x, measured.y + headerHeight, measured.width, measured.height);
}

function getEstimatedMenuHeight(sections: FloatingMenuSection[]) {
  const itemCount = sections.reduce((total, section) => total + section.items.length, 0);
  const separatorCount = Math.max(sections.length - 1, 0);
  return MENU_VERTICAL_PADDING + itemCount * MENU_ROW_ESTIMATED_HEIGHT + separatorCount * MENU_SECTION_SEPARATOR_HEIGHT;
}

export function FloatingMenuProvider({ children, placementOverride }: FloatingMenuProviderProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const [menu, setMenu] = useState<FloatingMenuState | null>(null);

  const closeMenu = useCallback(() => {
    setMenu(null);
  }, []);

  const openMenu = useCallback(
    (
      sections: FloatingMenuSection[],
      from: RefObject<View>,
      options?: { placementOverride?: PopoverPlacement }
    ) => {
      const effectivePlacementOverride = options?.placementOverride ?? placementOverride;
      if (!from.current) {
        setMenu({ sections, from, placement: effectivePlacementOverride ?? PopoverPlacement.TOP });
        return;
      }

      from.current.measureInWindow((x, y, width, height) => {
        const headerRect = getHeaderTriggerRect({ x, y, width, height }, headerHeight);
        const anchorY = headerRect ? headerRect.y : y;

        const estimatedMenuHeight = getEstimatedMenuHeight(sections);
        const availableAbove = anchorY - insets.top - MENU_EDGE_MARGIN;
        const availableBelow = windowHeight - (anchorY + height) - Math.max(insets.bottom, 16) - MENU_EDGE_MARGIN;
        const placement =
          effectivePlacementOverride ??
          (availableBelow >= estimatedMenuHeight || availableBelow >= availableAbove
            ? PopoverPlacement.BOTTOM
            : PopoverPlacement.TOP);

        setMenu({ sections, from: headerRect ?? from, placement });
      });
    },
    [headerHeight, insets.bottom, insets.top, placementOverride, windowHeight]
  );

  const value = useMemo(
    () => ({
      menu,
      openMenu,
      closeMenu,
    }),
    [closeMenu, menu, openMenu]
  );

  return <FloatingMenuContext.Provider value={value}>{children}</FloatingMenuContext.Provider>;
}

export function useFloatingMenu() {
  const context = useContext(FloatingMenuContext);
  if (!context) {
    throw new Error("useFloatingMenu must be used within FloatingMenuProvider");
  }
  return context;
}

export function FloatingMenuHost({ width, mode = PopoverMode.JS_MODAL, offset }: FloatingMenuHostProps) {
  const { menu, closeMenu } = useFloatingMenu();

  return (
    <FloatingMenu
      isOpen={!!menu}
      onClose={closeMenu}
      from={menu?.from}
      sections={menu?.sections ?? []}
      mode={mode}
      placement={menu?.placement}
      offset={offset}
      width={width}
    />
  );
}

export function FloatingMenuTrigger({
  sections,
  children,
  touchableStyle,
  placementOverride,
  onBeforeOpen,
  activeOpacity = 0.7,
  disabled,
}: FloatingMenuTriggerProps) {
  const anchorRef = useRef<View>(null!);
  const { openMenu } = useFloatingMenu();

  return (
    <TouchableOpacity
      style={touchableStyle}
      activeOpacity={activeOpacity}
      disabled={disabled}
      onPress={async () => {
        if (onBeforeOpen) await onBeforeOpen();
        openMenu(sections, anchorRef, { placementOverride });
      }}
    >
      <View ref={anchorRef}>{children}</View>
    </TouchableOpacity>
  );
}
