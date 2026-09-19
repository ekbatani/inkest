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

const TopbarActionsContext = React.createContext<TopbarActionsValue | null>(null);

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

  const value = React.useMemo(
    () => ({ slot, claimSlot, releaseSlot }),
    [slot, claimSlot, releaseSlot],
  );

  return (
    <TopbarActionsContext.Provider value={value}>
      {children}
    </TopbarActionsContext.Provider>
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
  const actions = React.useContext(TopbarActionsContext);

  React.useEffect(() => {
    if (!actions) return;

    if (enabled) {
      actions.claimSlot(ownerId, node);
      return () => actions.releaseSlot(ownerId);
    }

    actions.releaseSlot(ownerId);
  }, [actions, ownerId, node, enabled]);
}
