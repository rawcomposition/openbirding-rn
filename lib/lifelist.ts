import { LifeListEntry, useSettingsStore } from "@/stores/settingsStore";
import Toast from "react-native-toast-message";

export type LifeListMenuProps = {
  label: string;
  icon: "plus.circle" | "minus.circle";
  isDestructive: boolean;
};

export function getLifeListMenuProps(
  code: string,
  lifelist: LifeListEntry[] | null,
  exclusions: string[] | null
): LifeListMenuProps {
  if (exclusions?.includes(code)) return { label: "Remove Exclusion", icon: "minus.circle", isDestructive: true };
  if (lifelist?.some((e) => e.code === code)) {
    return { label: "Remove from Life List", icon: "minus.circle", isDestructive: true };
  }
  return { label: "Add to Life List", icon: "plus.circle", isDestructive: false };
}

export function handleLifeListAction(code: string, speciesName: string) {
  const { lifelist, lifelistExclusions, setLifelist, setLifelistExclusions } = useSettingsStore.getState();

  if (lifelistExclusions?.includes(code)) {
    setLifelistExclusions((lifelistExclusions || []).filter((c) => c !== code));
  } else if (lifelist?.some((e) => e.code === code)) {
    setLifelist((lifelist || []).filter((e) => e.code !== code));
  } else {
    const newEntry = {
      code,
      date: new Date().toISOString().split("T")[0],
      location: "N/A",
      checklistId: null,
      isManual: true,
    };
    setLifelist([...(lifelist || []), newEntry]);
    Toast.show({ type: "success", text1: `Added ${speciesName} to life list` });
  }
}
