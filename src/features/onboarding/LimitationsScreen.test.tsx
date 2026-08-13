import {
  fireEvent,
  render,
} from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../i18n";
import { LimitationsScreen } from "./LimitationsScreen";

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

async function renderLimitationsScreen(
  onSubmit = jest.fn(),
) {
  const queries = await render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <LimitationsScreen onSubmit={onSubmit} />
    </SafeAreaProvider>,
  );

  return {
    ...queries,
    onSubmit,
  };
}

describe("LimitationsScreen", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("shows the approved limitations copy", async () => {
    const { getByText, queryByText } =
      await renderLimitationsScreen();

    expect(
      getByText(
        "Is there anything we should avoid today?",
      ),
    ).toBeTruthy();

    expect(
      getByText(
        "We use this only to avoid unsuitable movements—not to diagnose a condition.",
      ),
    ).toBeTruthy();

    expect(getByText("No")).toBeTruthy();

    expect(
      getByText("I have pain or discomfort"),
    ).toBeTruthy();

    expect(
      getByText(
        "I have an ongoing movement limitation",
      ),
    ).toBeTruthy();

    expect(queryByText("Lower back")).toBeNull();
  });

  it("submits immediately when there is no limitation", async () => {
    const { getByRole, onSubmit } =
      await renderLimitationsScreen();

    await fireEvent.press(
      getByRole("button", { name: "No" }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      kind: "none",
      areas: [],
    });
  });

  it("requires an area after pain is selected", async () => {
    const { getByRole } =
      await renderLimitationsScreen();

    await fireEvent.press(
      getByRole("button", {
        name: "I have pain or discomfort",
      }),
    );

    expect(
      getByRole("button", { name: "Continue" }),
    ).toBeDisabled();
  });

  it("submits pain with the selected areas", async () => {
    const { getByRole, onSubmit } =
      await renderLimitationsScreen();

    await fireEvent.press(
      getByRole("button", {
        name: "I have pain or discomfort",
      }),
    );

    await fireEvent.press(
      getByRole("checkbox", {
        name: "Lower back",
      }),
    );

    await fireEvent.press(
      getByRole("checkbox", {
        name: "Hips",
      }),
    );

    await fireEvent.press(
      getByRole("button", { name: "Continue" }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      kind: "pain",
      areas: ["lower_back", "hips"],
    });
  });
});