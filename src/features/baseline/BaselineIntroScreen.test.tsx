import {
  fireEvent,
  render,
} from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../i18n";
import { BaselineIntroScreen } from "./BaselineIntroScreen";

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

async function renderBaselineIntroScreen(
  onStart = jest.fn(),
) {
  const queries = await render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <BaselineIntroScreen onStart={onStart} />
    </SafeAreaProvider>,
  );

  return {
    ...queries,
    onStart,
  };
}

describe("BaselineIntroScreen", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("shows the approved baseline introduction copy", async () => {
    const { getByText } =
      await renderBaselineIntroScreen();

    expect(
      getByText("Let's find your starting point"),
    ).toBeTruthy();

    expect(
      getByText(
        "You'll try up to three short movements. This takes about 2–3 minutes and is not a maximum-effort test.",
      ),
    ).toBeTruthy();

    expect(
      getByText(
        "Move slowly and stay within a comfortable range. Stop immediately if you feel pain.",
      ),
    ).toBeTruthy();

    expect(
      getByText("Start baseline"),
    ).toBeTruthy();
  });

  it("reports when the user starts the baseline", async () => {
    const { getByRole, onStart } =
      await renderBaselineIntroScreen();

    await fireEvent.press(
      getByRole("button", {
        name: "Start baseline",
      }),
    );

    expect(onStart).toHaveBeenCalledTimes(1);
  });
});