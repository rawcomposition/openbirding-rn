import IconButton from "@/components/IconButton";
import Input from "@/components/Input";
import { savePlaceNotes } from "@/lib/database";
import tw from "@/lib/tw";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Toast from "react-native-toast-message";
import BaseBottomSheet from "./BaseBottomSheet";

type PlaceNotesSheetProps = {
  isOpen: boolean;
  placeId: string;
  initialNotes: string;
  onClose: () => void;
};

export default function PlaceNotesSheet({ isOpen, placeId, initialNotes, onClose }: PlaceNotesSheetProps) {
  const queryClient = useQueryClient();
  const dismissRef = useRef<(() => Promise<void>) | null>(null);
  const pendingSaveRef = useRef(false);

  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    if (isOpen) {
      setNotes(initialNotes);
    }
  }, [isOpen, initialNotes]);

  const handleSheetClose = () => {
    if (pendingSaveRef.current) {
      pendingSaveRef.current = false;
    }
    onClose();
  };

  const mutation = useMutation({
    mutationFn: ({ placeId, notes }: { placeId: string; notes: string }) => savePlaceNotes(placeId, notes),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["savedPlace", placeId] });
      queryClient.invalidateQueries({ queryKey: ["savedPlaces"] });
      pendingSaveRef.current = true;
      await dismissRef.current?.();
    },
    onError: () => {
      Toast.show({ type: "error", text1: "Error saving notes" });
    },
  });

  const handleSave = () => {
    mutation.mutate({ placeId, notes: notes.trim() });
  };

  const headerContent = (dismiss: () => Promise<void>) => {
    dismissRef.current = dismiss;
    return (
      <View style={tw`flex-row items-center justify-between px-5`}>
        <IconButton icon="close" onPress={dismiss} />
        <Text style={tw`text-gray-900 text-xl font-bold`}>Notes</Text>
        <IconButton icon="checkmark" variant="primary" onPress={handleSave} disabled={mutation.isPending} />
      </View>
    );
  };

  return (
    <BaseBottomSheet isOpen={isOpen} onClose={handleSheetClose} detents={["auto"]} headerContent={headerContent} dimmed>
      <View style={tw`px-4 py-6`}>
        <Input
          placeholder="Add a private note..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={12}
          returnKeyType="done"
          autoFocus
        />
      </View>
    </BaseBottomSheet>
  );
}
