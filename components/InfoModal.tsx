import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import tw from "twrnc";

type InfoModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
};

export default function InfoModal({ visible, onClose, title, content }: InfoModalProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={tw`flex-1 bg-black bg-opacity-50 items-center justify-center`}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={tw`bg-white rounded-lg p-6 mx-8 max-w-sm`}>
          <Text style={tw`text-lg font-bold mb-4 text-center`}>{title}</Text>
          {content}
          <TouchableOpacity style={tw`mt-4 bg-blue-500 py-2 px-4 rounded`} onPress={onClose}>
            <Text style={tw`text-white text-center font-medium`}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
