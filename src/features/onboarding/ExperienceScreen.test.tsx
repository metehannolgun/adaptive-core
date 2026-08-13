import {
  fireEvent,
  render,
} from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../i18n";
import { ExperienceScreen } from "./ExperienceScreen";

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

async function renderExperienceScreen(
  onSelect = jest.fn(),
) {
  const queries = await render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <ExperienceScreen onSelect={onSelect} />
    </SafeAreaProvider>,
  );

  return {
    ...queries,
    onSelect,
  };
}

describe("ExperienceScreen", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("shows the approved experience copy", async () => {
    const { getByText } = await renderExperienceScreen();

    expect(
      getByText(
        "How familiar are you with core training?",
      ),
    ).toBeTruthy();

    expect(
      getByText(
        "This helps us choose a safe starting point.",
      ),
    ).toBeTruthy();

    expect(
      getByText("I'm just getting started"),
    ).toBeTruthy();

    expect(
      getByText("I have some experience"),
    ).toBeTruthy();

    expect(
      getByText("I train regularly"),
    ).toBeTruthy();
  });

  it.each([
    ["I'm just getting started", "beginner"],
    ["I have some experience", "some"],
    ["I train regularly", "regular"],
  ] as const)(
    "reports %s as %s",
    async (label, expectedExperience) => {
      const { getByRole, onSelect } =
        await renderExperienceScreen();

      await fireEvent.press(
        getByRole("button", { name: label }),
      );

      expect(onSelect).toHaveBeenCalledWith(
        expectedExperience,
      );
    },
  );
});