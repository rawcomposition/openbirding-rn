import tw from "@/lib/tw";
import { useDownloadStore } from "@/stores/downloadStore";
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from "react-native";

export default function DownloadOverlay() {
  const phase = useDownloadStore((state) => state.phase);
  const packName = useDownloadStore((state) => state.packName);
  const progress = useDownloadStore((state) => state.progress);
  const cancel = useDownloadStore((state) => state.cancel);

  if (phase === "idle") return null;

  const isInstalling = phase === "installing";
  const statusText = isInstalling ? "Installing..." : "Downloading...";

  return (
    <Modal visible={true} transparent={true} animationType="fade" onRequestClose={cancel}>
      <View style={tw`flex-1 bg-black/50 items-center justify-center`}>
        <View style={tw`bg-white rounded-2xl p-6 mx-8 w-72 items-center`}>
          <Text style={tw`text-lg font-semibold text-gray-900 mb-1`}>{packName}</Text>
          <Text style={tw`text-sm text-gray-500 mb-4`}>{statusText}</Text>

          <View style={tw`w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2`}>
            <View style={[tw`h-full bg-blue-500 rounded-full`, { width: `${progress}%` }]} />
          </View>

          <Text style={tw`text-sm text-gray-600 mb-4`}>{progress}%</Text>

          {!isInstalling && (
            <TouchableOpacity
              onPress={cancel}
              activeOpacity={0.7}
              style={tw`px-6 py-2 rounded-lg border border-gray-300 bg-white`}
            >
              <Text style={tw`text-gray-700 font-medium`}>Cancel</Text>
            </TouchableOpacity>
          )}

          {isInstalling && <ActivityIndicator size="small" color={tw.color("blue-500")} />}
        </View>
      </View>
    </Modal>
  );
}
