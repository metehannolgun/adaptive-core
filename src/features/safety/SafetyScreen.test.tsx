import {
  fireEvent,
  render,
} from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../i18n";
import { SafetyScreen } from "./SafetyScreen";

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

async function renderSafetyScreen(onContinue = jest.fn()) {
  const queries = await render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <SafetyScreen onContinue={onContinue} />
    </SafeAreaProvider>,
  );

  return {
    ...queries,
    onContinue,
  };
}

describe("SafetyScreen", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("shows the approved safety copy", async () => {
    const { getByText } = await renderSafetyScreen();

    expect(getByText("Train safely")).toBeTruthy();

    expect(
      getByText(
        "Adaptive Core provides general fitness guidance for adults aged 18 and over. It is not a medical device and does not diagnose, treat, or provide rehabilitation for any condition.",
      ),
    ).toBeTruthy();

    expect(
      getByText(
        "Stop exercising if you feel pain, dizziness, chest discomfort, or unusual shortness of breath. Seek urgent medical help if symptoms are severe or do not go away.",
      ),
    ).toBeTruthy();
  });

  it("keeps Continue disabled before confirmation", async () => {
    const { getByRole } = await renderSafetyScreen();

    expect(
      getByRole("button", { name: "Continue" }),
    ).toBeDisabled();
  });

  it("continues after the user confirms the adult safety notice", async () => {
    const { getByRole, onContinue } =
      await renderSafetyScreen();

    await fireEvent.press(
      getByRole("checkbox", {
        name: "I am 18 or older and I understand.",
      }),
    );

    await fireEvent.press(
      getByRole("button", { name: "Continue" }),
    );

    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});