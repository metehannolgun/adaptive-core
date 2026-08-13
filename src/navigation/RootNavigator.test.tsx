import {
  fireEvent,
  render,
} from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../i18n";
import { RootNavigator } from "./RootNavigator";

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

async function renderNavigator() {
  return render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <RootNavigator />
    </SafeAreaProvider>,
  );
}

describe("RootNavigator", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("follows the first-use flow through baseline intro", async () => {
    const queries = await renderNavigator();

    expect(
      queries.getByText(
        "Your next workout adapts to how you perform.",
      ),
    ).toBeTruthy();

    await fireEvent.press(
      queries.getByRole("button", {
        name: "Continue without sharing",
      }),
    );

    expect(
      await queries.findByText("Train safely"),
    ).toBeTruthy();

    await fireEvent.press(
      queries.getByRole("checkbox", {
        name: "I am 18 or older and I understand.",
      }),
    );

    await fireEvent.press(
      queries.getByRole("button", {
        name: "Continue",
      }),
    );

    expect(
      await queries.findByText(
        "How familiar are you with core training?",
      ),
    ).toBeTruthy();

    await fireEvent.press(
      queries.getByRole("button", {
        name: "I'm just getting started",
      }),
    );

    expect(
      await queries.findByText(
        "How long would you like most workouts to be?",
      ),
    ).toBeTruthy();

    await fireEvent.press(
      queries.getByRole("button", {
        name: "10 minutes",
      }),
    );

    expect(
      await queries.findByText(
        "Is there anything we should avoid today?",
      ),
    ).toBeTruthy();

    await fireEvent.press(
      queries.getByRole("button", {
        name: "No",
      }),
    );

    expect(
      await queries.findByText(
        "Let's find your starting point",
      ),
    ).toBeTruthy();
  });
});