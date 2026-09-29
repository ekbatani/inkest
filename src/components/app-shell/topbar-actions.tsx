"use client";

import * as React from "react";

type TopbarSlot = {
  ownerId: string;
  node: React.ReactNode;
};

type TopbarActionsValue = {
  slot: TopbarSlot | null;
  claimSlot: (ownerId: string, node: React.ReactNode) => void;
  releaseSlot: (ownerId: string) => void;
};

type TopbarSlotControls = Pick<TopbarActionsValue, "claimSlot" | "releaseSlot">;

const TopbarActionsContext = React.createContext<TopbarActionsValue | null>(null);
// The claim/release callbacks never change, so slot owners read them from a
// separate context: they must not re-render (or re-run their claim effect)
// every time the slot itself changes.
const TopbarSlotControlsContext = React.createContext<TopbarSlotControls | null>(null);

export function TopbarActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [slot, setSlot] = React.useState<TopbarSlot | null>(null);

  const claimSlot = React.useCallback((ownerId: string, node: React.ReactNode) => {
    setSlot((prev) =>
      prev && prev.ownerId === ownerId && prev.node === node
        ? prev
        : { ownerId, node },
    );
  }, []);

  const releaseSlot = React.useCallback((ownerId: string) => {
    setSlot((prev) => (prev?.ownerId === ownerId ? null : prev));
  }, []);

  const controls = React.useMemo(
    () => ({ claimSlot, releaseSlot }),
    [claimSlot, releaseSlot],
  );

  const value = React.useMemo(
    () => ({ slot, claimSlot, releaseSlot }),
    [slot, claimSlot, releaseSlot],
  );

  return (
    <TopbarSlotControlsContext.Provider value={controls}>
      <TopbarActionsContext.Provider value={value}>
        {children}
      </TopbarActionsContext.Provider>
    </TopbarSlotControlsContext.Provider>
  );
}

export function useTopbarActions(): TopbarActionsValue | null {
  return React.useContext(TopbarActionsContext);
}

/**
 * Renders `node` in the Topbar action group while `enabled`, and removes it
 * otherwise. The Topbar lives at the app-shell level while page components own
 * the surrounding state, so pages push their action through this slot instead.
 * Hidden workspace tabs keep their pages mounted, so claims are keyed by
 * `ownerId` and a release never steals the slot from another owner.
 */
export function useTopbarSlot(
  ownerId: string,
  node: React.ReactNode,
  enabled: boolean,
) {
  const controls = React.useContext(TopbarSlotControlsContext);

  React.useEffect(() => {
    if (!controls) return;

    if (enabled) {
      controls.claimSlot(ownerId, node);
      return () => controls.releaseSlot(ownerId);
    }

    controls.releaseSlot(ownerId);
  }, [controls, ownerId, node, enabled]);
}
