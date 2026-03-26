import tw from "@/lib/tw";
import { Text, TouchableOpacity, View } from "react-native";

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

type MonthStripProps = {
  selectedMonths: number[];
  onToggleMonth: (month: number) => void;
  onSelectAllYear: () => void;
};

export default function MonthStrip({ selectedMonths, onToggleMonth, onSelectAllYear }: MonthStripProps) {
  const isAllYear = selectedMonths.length === 0;

  return (
    <View style={tw`flex-row items-center`}>
      <TouchableOpacity
        onPress={onSelectAllYear}
        activeOpacity={0.7}
        style={[
          tw`h-7 rounded-full items-center justify-center px-2.5 mr-1.5`,
          isAllYear ? tw`bg-emerald-600` : {},
        ]}
      >
        <Text
          style={[
            tw`text-xs font-semibold`,
            isAllYear ? tw`text-white` : tw`text-gray-500`,
          ]}
        >
          All Year
        </Text>
      </TouchableOpacity>
      {MONTH_LETTERS.map((letter, i) => {
        const isSelected = !isAllYear && selectedMonths.includes(i);
        const prevSelected = !isAllYear && selectedMonths.includes(i - 1);
        const nextSelected = !isAllYear && selectedMonths.includes(i + 1);
        const roundLeft = !prevSelected;
        const roundRight = !nextSelected;
        return (
          <TouchableOpacity
            key={i}
            onPress={() => onToggleMonth(i)}
            activeOpacity={1}
            style={[
              tw`flex-1 h-7 items-center justify-center`,
              isSelected && tw`bg-emerald-600`,
              isSelected && (!roundLeft || !roundRight) && { transform: [{ scaleX: 1.05 }] },
              isSelected && {
                borderTopLeftRadius: roundLeft ? 9999 : 0,
                borderBottomLeftRadius: roundLeft ? 9999 : 0,
                borderTopRightRadius: roundRight ? 9999 : 0,
                borderBottomRightRadius: roundRight ? 9999 : 0,
              },
            ]}
          >
            <Text
              style={[
                tw`text-xs font-semibold`,
                isSelected ? tw`text-white` : tw`text-gray-500`,
              ]}
            >
              {letter}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
