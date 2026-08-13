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

type BaselineIntroScreenProps = {
  onStart: () => void;
};

export function BaselineIntroScreen({
  onStart,
}: BaselineIntroScreenProps) {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";

  const colors = {
    background: isDark ? "#202124" : "#F8F9FA",
    surface: isDark ? "#3C4043" : "#FFFFFF",
    safetySurface: isDark ? "#0A7669" : "#E6F7F5",
    text: isDark ? "#FFFFFF" : "#202124",
    secondaryText: isDark ? "#DADCE0" : "#5F6368",
    border: isDark ? "#5F6368" : "#DADCE0",
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
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            style={[
              styles.title,
              { color: colors.text },
            ]}
          >
            {translate("baseline.title")}
          </Text>

          <Text
            style={[
              styles.description,
              { color: colors.secondaryText },
            ]}
          >
            {translate("baseline.description")}
          </Text>
        </View>

        <View
          style={[
            styles.safetyCard,
            {
              backgroundColor: colors.safetySurface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.safetyText,
              { color: colors.text },
            ]}
          >
            {translate("baseline.safety")}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={translate("baseline.cta")}
          onPress={onStart}
          style={({ pressed }) => [
            styles.startButton,
            {
              backgroundColor: pressed
                ? colors.primaryPressed
                : colors.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.startButtonText,
              { color: colors.onPrimary },
            ]}
          >
            {translate("baseline.cta")}
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
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36,
  },
  description: {
    marginTop: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  safetyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  safetyText: {
    fontSize: 15,
    lineHeight: 23,
  },
  startButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});