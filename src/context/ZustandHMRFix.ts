import type { UseBoundStore } from "zustand";

type HmrFixStore<T> = {
  getState: () => T;
  getInitialState: () => T;
  setState: (partial: Partial<T>) => void;
  subscribe: (listener: (state: T, prevState: T) => void) => () => void;
};

/// Persists zustand state between hot reloads in dev mode
/// See https://github.com/pmndrs/zustand/issues/934#issuecomment-2932960043
export const zustandHmrFix = <S extends HmrFixStore<Record<string, unknown>>>(
  name: string,
  useStore: UseBoundStore<S>
) => {
  type T = ReturnType<S["getState"]>;
  if (import.meta.hot) {
    const savedState = import.meta.hot!.data[name] as Partial<T> | undefined;
    if (savedState) {
      useStore.setState(savedState);
    }
    useStore.subscribe((state) => {
      import.meta.hot!.data[name] = { ...state };
    });
    import.meta.hot!.accept((newModule) => {
      if (newModule) {
        const savedState = import.meta.hot!.data[name] as
          | Partial<T>
          | undefined;
        if (savedState) {
          useStore.setState(savedState);
        }
      }
    });
  }
};
