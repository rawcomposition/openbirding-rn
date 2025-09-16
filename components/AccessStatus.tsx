import React from "react";
import { View, Text } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import tw from "twrnc";

type AccessStatusProps = {
  open: boolean | null;
  notes?: string | null;
  updatedAt?: string | null;
  lastUpdatedBy?: string | null;
};

export default function AccessStatus({ open, notes, updatedAt, lastUpdatedBy }: AccessStatusProps) {
  const getOpenAccessIcon = () => {
    if (open === true) {
      return <FontAwesome name="check-circle" size={20} color="#3b82f6" />;
    } else if (open === false) {
      return <FontAwesome name="times-circle" size={20} color="#ef4444" />;
    } else {
      return <FontAwesome name="question-circle" size={20} color="#9ca3af" />;
    }
  };

  const getOpenAccessText = () => {
    if (open === true) {
      return "Open Access";
    } else if (open === false) {
      return "Not Open Access";
    } else {
      return "Not Reviewed";
    }
  };

  return null; // TODO: Enable access status
  return (
    <View style={tw`bg-gray-50 rounded-lg p-4 mb-4 gap-3`}>
      <View style={tw`flex-row items-center`}>
        {getOpenAccessIcon()}
        <Text style={tw`text-gray-900 text-base font-medium ml-2`}>{getOpenAccessText()}</Text>
      </View>

      {notes && (
        <View style={tw`pt-3 border-t border-gray-200`}>
          <Text style={tw`text-sm text-gray-800`}>{notes}</Text>
        </View>
      )}

      {updatedAt && (
        <View style={tw`mt-3 pt-3 border-t border-gray-200`}>
          <View style={tw`flex-row items-center`}>
            <FontAwesome name="calendar" size={12} color="#9ca3af" />
            <Text style={tw`text-xs text-gray-500 ml-1`}>
              Updated {new Date(updatedAt).toLocaleDateString()}
              {lastUpdatedBy && ` by ${lastUpdatedBy}`}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
