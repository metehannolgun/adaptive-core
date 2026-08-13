import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { translate } from "../../i18n";

type WelcomeScreenProps = {
  onAnalyticsChoice: (enabled: boolean) => void;
};

export function WelcomeScreen({
  onAnalyticsChoice,
}: WelcomeScreenProps) {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";

  const colors = {
    background: isDark ? "#202124" : "#F8F9FA",
    surface: isDark ? "#3C4043" : "#E6F7F5",
    text: isDark ? "#FFFFFF" : "#202124",
    secondaryText: isDark ? "#DADCE0" : "#5F6368",
    primary: "#1AAF9C",
    primaryPressed: "#159E8D",
    onPrimary: "#FFFFFF",
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.screen,
        {
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text
            accessibilityRole="header"
            style={[styles.headline, { color: colors.text }]}
          >
            {translate("welcome.headline")}
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: colors.secondaryText },
            ]}
          >
            {translate("welcome.subtitle")}
          </Text>
        </View>

        <View
          style={[
            styles.analyticsCard,
            { backgroundColor: colors.surface },
          ]}
        >
          <Text
            style={[
              styles.analyticsDescription,
              { color: colors.secondaryText },
            ]}
          >
            {translate("analytics.description")}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translate("analytics.share")}
            onPress={() => onAnalyticsChoice(true)}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: pressed
                  ? colors.primaryPressed
                  : colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: colors.onPrimary },
              ]}
            >
              {translate("analytics.share")}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translate("analytics.decline")}
            onPress={() => onAnalyticsChoice(false)}
            style={({ pressed }) => [
              styles.secondaryButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: colors.primary },
              ]}
            >
              {translate("analytics.decline")}
            </Text>
          </Pressable>
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
  },
  hero: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 48,
  },
  headline: {
    maxWidth: 420,
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 43,
    letterSpacing: -0.8,
  },
  subtitle: {
    maxWidth: 420,
    marginTop: 20,
    fontSize: 17,
    lineHeight: 26,
  },
  analyticsCard: {
    borderRadius: 16,
    padding: 20,
  },
  analyticsDescription: {
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    marginTop: 16,
    gap: 8,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});