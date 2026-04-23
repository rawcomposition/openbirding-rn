import React, { createContext, ReactNode, RefObject, useCallback, useContext, useMemo, useRef, useState } from "react";
import { StyleProp, TouchableOpacity, TouchableOpacityProps, useWindowDimensions, View, ViewStyle } from "react-native";
import { PopoverMode, PopoverPlacement } from "react-native-popover-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FloatingMenu, { FloatingMenuSection } from "./FloatingMenu";

type FloatingMenuState = {
  sections: FloatingMenuSection[];
  from: RefObject<View>;
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

function getEstimatedMenuHeight(sections: FloatingMenuSection[]) {
  const itemCount = sections.reduce((total, section) => total + section.items.length, 0);
  const separatorCount = Math.max(sections.length - 1, 0);
  return MENU_VERTICAL_PADDING + itemCount * MENU_ROW_ESTIMATED_HEIGHT + separatorCount * MENU_SECTION_SEPARATOR_HEIGHT;
}

export function FloatingMenuProvider({ children, placementOverride }: FloatingMenuProviderProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
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
      if (effectivePlacementOverride) {
        setMenu({ sections, from, placement: effectivePlacementOverride });
        return;
      }

      const fallbackPlacement = PopoverPlacement.TOP;
      if (!from.current) {
        setMenu({ sections, from, placement: fallbackPlacement });
        return;
      }

      from.current.measureInWindow((_x, y, _width, height) => {
        const estimatedMenuHeight = getEstimatedMenuHeight(sections);
        const availableAbove = y - insets.top - MENU_EDGE_MARGIN;
        const availableBelow = windowHeight - (y + height) - Math.max(insets.bottom, 16) - MENU_EDGE_MARGIN;
        const placement =
          availableBelow >= estimatedMenuHeight || availableBelow >= availableAbove
            ? PopoverPlacement.BOTTOM
            : PopoverPlacement.TOP;

        setMenu({ sections, from, placement });
      });
    },
    [insets.bottom, insets.top, placementOverride, windowHeight]
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

export function FloatingMenuHost({ width }: FloatingMenuHostProps) {
  const { menu, closeMenu } = useFloatingMenu();

  return (
    <FloatingMenu
      isOpen={!!menu}
      onClose={closeMenu}
      from={menu?.from}
      sections={menu?.sections ?? []}
      mode={PopoverMode.JS_MODAL}
      placement={menu?.placement}
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
