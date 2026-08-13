import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { translate } from "../../i18n";

export type LimitationArea =
  | "lower_back"
  | "neck"
  | "shoulders"
  | "hips"
  | "knees"
  | "other";

type ActiveLimitationKind = "pain" | "ongoing";

export type LimitationSelection =
  | {
      kind: "none";
      areas: [];
    }
  | {
      kind: ActiveLimitationKind;
      areas: LimitationArea[];
    };

type LimitationsScreenProps = {
  onSubmit: (selection: LimitationSelection) => void;
};

const limitationOptions = [
  {
    value: "none",
    labelKey: "onboarding.limit.no",
  },
  {
    value: "pain",
    labelKey: "onboarding.limit.pain",
  },
  {
    value: "ongoing",
    labelKey: "onboarding.limit.ongoing",
  },
] as const;

const areaOptions = [
  {
    value: "lower_back",
    labelKey: "onboarding.area.lower_back",
  },
  {
    value: "neck",
    labelKey: "onboarding.area.neck",
  },
  {
    value: "shoulders",
    labelKey: "onboarding.area.shoulders",
  },
  {
    value: "hips",
    labelKey: "onboarding.area.hips",
  },
  {
    value: "knees",
    labelKey: "onboarding.area.knees",
  },
  {
    value: "other",
    labelKey: "onboarding.area.other",
  },
] as const;

export function LimitationsScreen({
  onSubmit,
}: LimitationsScreenProps) {
  const [selectedKind, setSelectedKind] =
    useState<ActiveLimitationKind | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<
    LimitationArea[]
  >([]);

  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";

  const colors = {
    background: isDark ? "#202124" : "#F8F9FA",
    surface: isDark ? "#3C4043" : "#FFFFFF",
    selectedSurface: isDark ? "#0A7669" : "#E6F7F5",
    text: isDark ? "#FFFFFF" : "#202124",
    secondaryText: isDark ? "#DADCE0" : "#5F6368",
    border: isDark ? "#5F6368" : "#DADCE0",
    primary: "#1AAF9C",
    disabled: isDark ? "#5F6368" : "#BDC1C6",
    onPrimary: "#FFFFFF",
  };

  function handleKindSelection(
    kind: "none" | ActiveLimitationKind,
  ) {
    if (kind === "none") {
      onSubmit({
        kind: "none",
        areas: [],
      });

      return;
    }

    setSelectedKind(kind);
    setSelectedAreas([]);
  }

  function toggleArea(area: LimitationArea) {
    setSelectedAreas((currentAreas) => {
      if (currentAreas.includes(area)) {
        return currentAreas.filter(
          (currentArea) => currentArea !== area,
        );
      }

      return [...currentAreas, area];
    });
  }

  function handleContinue() {
    if (
      selectedKind === null ||
      selectedAreas.length === 0
    ) {
      return;
    }

    onSubmit({
      kind: selectedKind,
      areas: selectedAreas,
    });
  }

  const canContinue =
    selectedKind !== null && selectedAreas.length > 0;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.screen,
        {
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.content}>
        <Text
          accessibilityRole="header"
          style={[
            styles.title,
            { color: colors.text },
          ]}
        >
          {translate("onboarding.limit.title")}
        </Text>

        <Text
          style={[
            styles.helper,
            { color: colors.secondaryText },
          ]}
        >
          {translate("onboarding.limit.helper")}
        </Text>

        <View style={styles.options}>
          {limitationOptions.map((option) => {
            const label = translate(option.labelKey);
            const isSelected =
              option.value === selectedKind;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{
                  selected: isSelected,
                }}
                onPress={() =>
                  handleKindSelection(option.value)
                }
                style={[
                  styles.option,
                  {
                    backgroundColor: isSelected
                      ? colors.selectedSurface
                      : colors.surface,
                    borderColor: isSelected
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedKind !== null ? (
          <View style={styles.areaSection}>
            <View style={styles.areaGrid}>
              {areaOptions.map((option) => {
                const label = translate(option.labelKey);
                const isChecked =
                  selectedAreas.includes(option.value);

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="checkbox"
                    accessibilityLabel={label}
                    accessibilityState={{
                      checked: isChecked,
                    }}
                    onPress={() =>
                      toggleArea(option.value)
                    }
                    style={[
                      styles.area,
                      {
                        backgroundColor: isChecked
                          ? colors.selectedSurface
                          : colors.surface,
                        borderColor: isChecked
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.areaText,
                        { color: colors.text },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={translate(
                "safety.cta",
              )}
              accessibilityState={{
                disabled: !canContinue,
              }}
              disabled={!canContinue}
              onPress={handleContinue}
              style={[
                styles.continueButton,
                {
                  backgroundColor: canContinue
                    ? colors.primary
                    : colors.disabled,
                },
              ]}
            >
              <Text
                style={[
                  styles.continueText,
                  { color: colors.onPrimary },
                ]}
              >
                {translate("safety.cta")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  content: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36,
  },
  helper: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
  },
  options: {
    marginTop: 32,
    gap: 12,
  },
  option: {
    minHeight: 56,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  areaSection: {
    marginTop: 24,
  },
  areaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  area: {
    minHeight: 48,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  areaText: {
    fontSize: 15,
    fontWeight: "500",
  },
  continueButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  continueText: {
    fontSize: 16,
    fontWeight: "600",
  },
});