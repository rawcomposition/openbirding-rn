import tw from "@/lib/tw";
import React from "react";
import { Pressable, Text, View } from "react-native";
import Popover from "react-native-popover-view";

export type FloatingMenuItem = {
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
};

export type FloatingMenuSection = {
  items: FloatingMenuItem[];
};

type FloatingMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  from?: React.ComponentProps<typeof Popover>["from"] | React.RefObject<View | null>;
  mode?: React.ComponentProps<typeof Popover>["mode"];
  placement?: React.ComponentProps<typeof Popover>["placement"];
  sections: FloatingMenuSection[];
  width?: number;
};

export default function FloatingMenu({ isOpen, onClose, from, mode, placement, sections, width = 220 }: FloatingMenuProps) {
  if (!isOpen) return null;

  return (
    <Popover
      from={from as React.ComponentProps<typeof Popover>["from"]}
      mode={mode}
      placement={placement}
      isVisible
      onRequestClose={onClose}
      backgroundStyle={{ backgroundColor: "transparent" }}
      popoverStyle={[
        tw`rounded-xl bg-white shadow-lg`,
        {
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 12,
        },
      ]}
      arrowSize={{ width: 0, height: 0 }}
    >
      <View style={[tw`py-1`, { width }]}>
        {sections.map((section, sIdx) => (
          <View key={sIdx}>
            {sIdx > 0 && <View style={tw`h-px bg-gray-100 my-1`} />}
            {section.items.map((item, iIdx) => (
              <Pressable
                key={iIdx}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
                style={({ pressed }) => [
                  tw`flex-row items-center px-3 py-3`,
                  pressed && tw`bg-gray-100`,
                ]}
              >
                {item.icon && <View style={tw`mr-2.5 w-5 items-center`}>{item.icon}</View>}
                <Text
                  style={[
                    tw`text-base flex-1`,
                    item.destructive ? tw`text-red-600` : tw`text-gray-900`,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </Popover>
  );
}
