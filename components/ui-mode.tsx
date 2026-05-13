"use client";

import { createContext, useContext } from "react";

export type UiMode = "classic" | "studio";

export const UiModeContext = createContext<{
  mode: UiMode;
  setMode: (mode: UiMode) => void;
}>({
  mode: "classic",
  setMode: () => undefined
});

export function useUiMode() {
  return useContext(UiModeContext);
}
