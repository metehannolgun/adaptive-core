import { fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../i18n";
import { WelcomeScreen } from "./WelcomeScreen";

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

async function renderWelcomeScreen(
  onAnalyticsChoice = jest.fn(),
) {
  const queries = await render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <WelcomeScreen onAnalyticsChoice={onAnalyticsChoice} />
    </SafeAreaProvider>,
  );

  return {
    ...queries,
    onAnalyticsChoice,
  };
}

describe("WelcomeScreen", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("shows the approved Welcome and analytics copy", async () => {
    const { getByText } = await renderWelcomeScreen();

    expect(
      getByText(
        "Your next workout adapts to how you perform.",
      ),
    ).toBeTruthy();

    expect(
      getByText(
        "Short 5, 10, or 15-minute core workouts. No fixed calendar—just clear, gradual progress.",
      ),
    ).toBeTruthy();

    expect(
      getByText(
        "Anonymous usage data helps us improve the app. Personal or health information is not shared.",
      ),
    ).toBeTruthy();
  });

  it("reports when analytics sharing is accepted", async () => {
    const { getByRole, onAnalyticsChoice } =
      await renderWelcomeScreen();

    fireEvent.press(
      getByRole("button", {
        name: "Share and continue",
      }),
    );

    expect(onAnalyticsChoice).toHaveBeenCalledWith(true);
  });

  it("reports when analytics sharing is declined", async () => {
    const { getByRole, onAnalyticsChoice } =
      await renderWelcomeScreen();

    fireEvent.press(
      getByRole("button", {
        name: "Continue without sharing",
      }),
    );

    expect(onAnalyticsChoice).toHaveBeenCalledWith(false);
  });
});