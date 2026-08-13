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

export type WorkoutDuration = 5 | 10 | 15;

type DurationScreenProps = {
  onSelect: (duration: WorkoutDuration) => void;
};

const durationOptions = [
  {
    value: 5,
    labelKey: "onboarding.dur.5",
  },
  {
    value: 10,
    labelKey: "onboarding.dur.10",
  },
  {
    value: 15,
    labelKey: "onboarding.dur.15",
  },
] as const;

export function DurationScreen({
  onSelect,
}: DurationScreenProps) {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";

  const colors = {
    background: isDark ? "#202124" : "#F8F9FA",
    surface: isDark ? "#3C4043" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#202124",
    secondaryText: isDark ? "#DADCE0" : "#5F6368",
    border: isDark ? "#5F6368" : "#DADCE0",
    primary: "#1AAF9C",
    primarySurface: isDark ? "#0A7669" : "#E6F7F5",
  };

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
        <View>
          <Text
            accessibilityRole="header"
            style={[
              styles.title,
              { color: colors.text },
            ]}
          >
            {translate("onboarding.dur.title")}
          </Text>

          <Text
            style={[
              styles.helper,
              { color: colors.secondaryText },
            ]}
          >
            {translate("onboarding.dur.helper")}
          </Text>
        </View>

        <View style={styles.options}>
          {durationOptions.map((option) => {
            const label = translate(option.labelKey);

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => onSelect(option.value)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: pressed
                      ? colors.primarySurface
                      : colors.surface,
                    borderColor: pressed
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
    flex: 1,
    alignSelf: "center",
    justifyContent: "center",
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
});