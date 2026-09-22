import { useMemo } from "react";
import { buildDefaultMapState } from "../constants.js";

export function useCharacterMapController({ form, setForm }) {
  const mapState = useMemo(
    () => ({
      ...buildDefaultMapState(),
      ...(form.mapData || {}),
    }),
    [form.mapData]
  );

  const updateMapData = (patchOrUpdater) => {
    setForm((prev) => {
      const prevMap = {
        ...buildDefaultMapState(),
        ...(prev.mapData || {}),
      };

      const nextMap =
        typeof patchOrUpdater === "function"
          ? patchOrUpdater(prevMap)
          : { ...prevMap, ...patchOrUpdater };

      return {
        ...prev,
        mapData: nextMap,
      };
    });
  };

  return { mapState, updateMapData };
}

export default useCharacterMapController;
