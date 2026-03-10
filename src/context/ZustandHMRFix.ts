import type { UseBoundStore } from "zustand";

/// Persists zustand state between hot reloads in dev mode
/// See https://github.com/pmndrs/zustand/issues/934#issuecomment-2932960043
export const zustandHmrFix = (name: string, useStore: UseBoundStore<any>) => {
  if (import.meta.hot) {
    const savedState = import.meta.hot!.data[name];
    if (savedState) {
      const newState = { ...savedState, actions: useStore.getState().actions };
      useStore.setState(newState);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useStore.subscribe((state: any) => {
      const stateToSave = { ...state };
      delete stateToSave.actions;
      import.meta.hot!.data[name] = stateToSave;
    });
    import.meta.hot!.accept((newModule) => {
      if (newModule) {
        const savedState = import.meta.hot!.data[name];
        if (savedState) {
          const newState = { ...savedState, actions: useStore.getState().actions };
          useStore.setState(newState);
        }
      }
    });
  }
};