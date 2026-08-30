import { Text } from "react-native";
import { act, render, waitFor } from "@testing-library/react-native";

import type { IdentityService, IdentityState } from "./identity-service";
import { IdentityBootstrap, useIdentityState } from "./identity-bootstrap";

type SplashPort = {
  hideAsync(): Promise<void>;
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });

  return { promise, resolve };
}

function createIdentityService(initialState: IdentityState = { status: "restoring" }) {
  let state = initialState;
  const listeners = new Set<(next: IdentityState) => void>();

  function publish(next: IdentityState) {
    state = next;
    for (const listener of listeners) {
      listener(next);
    }
  }

  const service: jest.Mocked<IdentityService> = {
    restore: jest.fn(async () => state),
    ensureGuestSession: jest.fn(async () => state),
    getState: jest.fn(() => state),
    subscribe: jest.fn((listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
  };

  return { service, publish };
}

function createSplash(): jest.Mocked<SplashPort> {
  return {
    hideAsync: jest.fn().mockResolvedValue(undefined),
  };
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("IdentityBootstrap", () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("renders onboarding and hides the splash without waiting for guest creation", async () => {
    const guestRequest = deferred<IdentityState>();
    const { service, publish } = createIdentityService();
    const splash = createSplash();
    service.restore.mockImplementation(async () => {
      const state: IdentityState = { status: "no_session" };
      publish(state);
      return state;
    });
    service.ensureGuestSession.mockReturnValue(guestRequest.promise);

    const queries = await render(
      <IdentityBootstrap service={service} splash={splash}>
        <Text>Onboarding</Text>
      </IdentityBootstrap>,
    );

    expect(queries.getByText("Onboarding")).toBeTruthy();

    await waitFor(() => expect(splash.hideAsync).toHaveBeenCalledTimes(1));
    expect(service.ensureGuestSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      guestRequest.resolve({ status: "guest", userId: "guest-1" });
      await Promise.resolve();
    });
  });

  it.each([
    { status: "guest", userId: "guest-1" },
    { status: "permanent", userId: "member-1" },
  ] as const)("keeps a restored $status identity without creating a guest", async (identity) => {
    const { service, publish } = createIdentityService();
    const splash = createSplash();
    service.restore.mockImplementation(async () => {
      publish(identity);
      return identity;
    });

    await render(
      <IdentityBootstrap service={service} splash={splash}>
        <Text>Onboarding</Text>
      </IdentityBootstrap>,
    );

    await waitFor(() => expect(splash.hideAsync).toHaveBeenCalledTimes(1));
    expect(service.ensureGuestSession).not.toHaveBeenCalled();
  });

  it("retries offline guest creation after the bounded retry delays", async () => {
    jest.useFakeTimers();
    const { service, publish } = createIdentityService();
    const splash = createSplash();
    service.restore.mockImplementation(async () => {
      const state: IdentityState = { status: "no_session" };
      publish(state);
      return state;
    });
    service.ensureGuestSession.mockImplementation(async () => {
      const attempt = service.ensureGuestSession.mock.calls.length;
      const state: IdentityState =
        attempt === 4
          ? { status: "guest", userId: "guest-after-retry" }
          : { status: "offline" };
      publish(state);
      return state;
    });

    const queries = await render(
      <IdentityBootstrap service={service} splash={splash}>
        <Text>Onboarding</Text>
      </IdentityBootstrap>,
    );

    expect(queries.getByText("Onboarding")).toBeTruthy();
    await flushPromises();
    expect(service.ensureGuestSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(999);
    });
    expect(service.ensureGuestSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(service.ensureGuestSession).toHaveBeenCalledTimes(2);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(2_999);
    });
    expect(service.ensureGuestSession).toHaveBeenCalledTimes(2);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(service.ensureGuestSession).toHaveBeenCalledTimes(3);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(9_999);
    });
    expect(service.ensureGuestSession).toHaveBeenCalledTimes(3);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(service.ensureGuestSession).toHaveBeenCalledTimes(4);

    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
    expect(service.ensureGuestSession).toHaveBeenCalledTimes(4);
  });

  it.each([
    { status: "guest", userId: "guest-restored" },
    { status: "permanent", userId: "member-restored" },
  ] as const)(
    "retries an offline restore until the existing $status identity is recovered",
    async (identity) => {
      jest.useFakeTimers();
      const { service, publish } = createIdentityService();
      const splash = createSplash();
      service.restore
        .mockImplementationOnce(async () => {
          const state: IdentityState = { status: "offline" };
          publish(state);
          return state;
        })
        .mockImplementationOnce(async () => {
          publish(identity);
          return identity;
        });

      await render(
        <IdentityBootstrap service={service} splash={splash}>
          <Text>Onboarding</Text>
        </IdentityBootstrap>,
      );

      await flushPromises();
      expect(service.restore).toHaveBeenCalledTimes(1);
      expect(service.ensureGuestSession).not.toHaveBeenCalled();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(1_000);
      });

      expect(service.restore).toHaveBeenCalledTimes(2);
      expect(service.ensureGuestSession).not.toHaveBeenCalled();
    },
  );

  it("cancels a pending offline retry when the bootstrap unmounts", async () => {
    jest.useFakeTimers();
    const { service, publish } = createIdentityService();
    const splash = createSplash();
    service.restore.mockImplementation(async () => {
      const state: IdentityState = { status: "offline" };
      publish(state);
      return state;
    });
    const queries = await render(
      <IdentityBootstrap service={service} splash={splash}>
        <Text>Onboarding</Text>
      </IdentityBootstrap>,
    );

    await flushPromises();
    expect(service.restore).toHaveBeenCalledTimes(1);
    expect(service.ensureGuestSession).not.toHaveBeenCalled();

    await act(async () => {
      queries.unmount();
    });
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(service.restore).toHaveBeenCalledTimes(1);
    expect(service.ensureGuestSession).not.toHaveBeenCalled();
  });

  it("provides state changes to descendants through useIdentityState", async () => {
    const { service, publish } = createIdentityService();
    const splash = createSplash();
    service.restore.mockResolvedValue({ status: "restoring" });

    function StateLabel() {
      const state = useIdentityState();
      return <Text>{state.status}</Text>;
    }

    const queries = await render(
      <IdentityBootstrap service={service} splash={splash}>
        <StateLabel />
      </IdentityBootstrap>,
    );

    await waitFor(() => expect(splash.hideAsync).toHaveBeenCalledTimes(1));

    await act(async () => {
      publish({ status: "guest", userId: "guest-context" });
    });

    expect(queries.getByText("guest")).toBeTruthy();
  });
});
