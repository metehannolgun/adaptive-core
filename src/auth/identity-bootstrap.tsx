import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import * as SplashScreen from "expo-splash-screen";

import type { IdentityService, IdentityState } from "./identity-service";

type SplashPort = Pick<typeof SplashScreen, "hideAsync">;

type IdentityBootstrapProps = PropsWithChildren<{
  service: IdentityService;
  splash?: SplashPort;
}>;

const retryDelays = [1_000, 3_000, 10_000];
type RetryOperation = "restore" | "guest";
const IdentityStateContext = createContext<IdentityState | null>(null);

function authUnavailableState(): IdentityState {
  return { status: "error", code: "AUTH_UNAVAILABLE" };
}

export function IdentityBootstrap({
  service,
  splash = SplashScreen,
  children,
}: IdentityBootstrapProps) {
  const [identityState, setIdentityState] = useState<IdentityState>(() =>
    service.getState(),
  );

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function updateState(next: IdentityState) {
      if (mounted) {
        setIdentityState(next);
      }
    }

    function scheduleRetry(operation: RetryOperation) {
      if (!mounted || retryCount >= retryDelays.length) {
        return;
      }

      const delay = retryDelays[retryCount];
      retryCount += 1;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (operation === "restore") {
          requestRestore();
        } else {
          requestGuestSession();
        }
      }, delay);
    }

    function handleGuestResult(result: IdentityState) {
      updateState(result);
      if (result.status === "offline") {
        scheduleRetry("guest");
      }
    }

    function handleRestoreResult(result: IdentityState) {
      updateState(result);
      if (result.status === "offline") {
        // Offline restore may still represent an existing guest or permanent
        // session, so recover it before anonymous account creation is allowed.
        scheduleRetry("restore");
      } else if (result.status === "no_session") {
        requestGuestSession();
      }
    }

    function requestRestore() {
      if (!mounted) {
        return;
      }

      let request: Promise<IdentityState>;
      try {
        request = service.restore();
      } catch {
        handleRestoreResult(authUnavailableState());
        return;
      }

      void request.then(handleRestoreResult).catch(() => {
        handleRestoreResult(authUnavailableState());
      });
    }

    function requestGuestSession() {
      if (!mounted) {
        return;
      }

      let request: Promise<IdentityState>;
      try {
        request = service.ensureGuestSession();
      } catch {
        handleGuestResult(authUnavailableState());
        return;
      }

      void request.then(handleGuestResult).catch(() => {
        handleGuestResult(authUnavailableState());
      });
    }

    const unsubscribe = service.subscribe(updateState);

    let restoreRequest: Promise<IdentityState>;
    try {
      restoreRequest = service.restore();
    } catch {
      restoreRequest = Promise.resolve(authUnavailableState());
    }

    void restoreRequest
      .then((restoredState) => {
        handleRestoreResult(restoredState);
      })
      .catch(() => {
        updateState(authUnavailableState());
      })
      .finally(() => {
        if (mounted) {
          void Promise.resolve(splash.hideAsync()).catch(() => undefined);
        }
      });

    return () => {
      mounted = false;
      if (retryTimer !== null) {
        clearTimeout(retryTimer);
      }
      unsubscribe();
    };
  }, [service, splash]);

  return (
    <IdentityStateContext.Provider value={identityState}>
      {children}
    </IdentityStateContext.Provider>
  );
}

export function useIdentityState(): IdentityState {
  const state = useContext(IdentityStateContext);
  if (state === null) {
    throw new Error("useIdentityState must be used within IdentityBootstrap");
  }

  return state;
}
