import {
  fireEvent,
  render,
} from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../i18n";
import { DurationScreen } from "./DurationScreen";

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

async function renderDurationScreen(
  onSelect = jest.fn(),
) {
  const queries = await render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <DurationScreen onSelect={onSelect} />
    </SafeAreaProvider>,
  );

  return {
    ...queries,
    onSelect,
  };
}

describe("DurationScreen", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("shows the approved duration copy", async () => {
    const { getByText } = await renderDurationScreen();

    expect(
      getByText(
        "How long would you like most workouts to be?",
      ),
    ).toBeTruthy();

    expect(
      getByText(
        "You can change this before any workout.",
      ),
    ).toBeTruthy();

    expect(getByText("5 minutes")).toBeTruthy();
    expect(getByText("10 minutes")).toBeTruthy();
    expect(getByText("15 minutes")).toBeTruthy();
  });

  it.each([
    ["5 minutes", 5],
    ["10 minutes", 10],
    ["15 minutes", 15],
  ] as const)(
    "reports %s as %s",
    async (label, expectedDuration) => {
      const { getByRole, onSelect } =
        await renderDurationScreen();

      await fireEvent.press(
        getByRole("button", { name: label }),
      );

      expect(onSelect).toHaveBeenCalledWith(
        expectedDuration,
      );
    },
  );
});