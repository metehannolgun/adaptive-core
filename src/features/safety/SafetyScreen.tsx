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

type SafetyScreenProps = {
  onContinue: () => void;
};

export function SafetyScreen({
  onContinue,
}: SafetyScreenProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
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
    disabled: isDark ? "#5F6368" : "#BDC1C6",
    onPrimary: "#FFFFFF",
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
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          {translate("safety.title")}
        </Text>

        <View
          style={[
            styles.notice,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.paragraph,
              { color: colors.secondaryText },
            ]}
          >
            {translate("safety.scope")}
          </Text>

          <Text
            style={[
              styles.paragraph,
              { color: colors.secondaryText },
            ]}
          >
            {translate("safety.consult")}
          </Text>

          <Text
            style={[
              styles.paragraph,
              styles.lastParagraph,
              { color: colors.secondaryText },
            ]}
          >
            {translate("safety.stop")}
          </Text>
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={translate("safety.confirm")}
          accessibilityState={{ checked: isConfirmed }}
          onPress={() => setIsConfirmed((current) => !current)}
          style={styles.confirmation}
        >
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: isConfirmed
                  ? colors.primary
                  : "transparent",
                borderColor: isConfirmed
                  ? colors.primary
                  : colors.border,
              },
            ]}
          >
            {isConfirmed ? (
              <Text style={styles.checkmark}>✓</Text>
            ) : null}
          </View>

          <Text
            style={[
              styles.confirmationText,
              { color: colors.text },
            ]}
          >
            {translate("safety.confirm")}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={translate("safety.cta")}
          accessibilityState={{ disabled: !isConfirmed }}
          disabled={!isConfirmed}
          onPress={onContinue}
          style={[
            styles.continueButton,
            {
              backgroundColor: isConfirmed
                ? colors.primary
                : colors.disabled,
            },
          ]}
        >
          <Text
            style={[
              styles.continueButtonText,
              { color: colors.onPrimary },
            ]}
          >
            {translate("safety.cta")}
          </Text>
        </Pressable>
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
  },
  title: {
    marginTop: 24,
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36,
  },
  notice: {
    marginTop: 32,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  paragraph: {
    marginBottom: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  lastParagraph: {
    marginBottom: 0,
  },
  confirmation: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: 6,
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  confirmationText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    lineHeight: 23,
  },
  continueButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});