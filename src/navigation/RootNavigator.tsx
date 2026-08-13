import { useState } from "react";
import {
  NavigationContainer,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

import { BaselineIntroScreen } from "../features/baseline/BaselineIntroScreen";
import {
  DurationScreen,
  type WorkoutDuration,
} from "../features/onboarding/DurationScreen";
import {
  ExperienceScreen,
  type ExperienceLevel,
} from "../features/onboarding/ExperienceScreen";
import {
  LimitationsScreen,
  type LimitationSelection,
} from "../features/onboarding/LimitationsScreen";
import { SafetyScreen } from "../features/safety/SafetyScreen";
import { WelcomeScreen } from "../features/welcome/WelcomeScreen";

type RootStackParamList = {
  Welcome: undefined;
  Safety: undefined;
  Experience: undefined;
  Duration: undefined;
  Limitations: undefined;
  BaselineIntro: undefined;
};

type OnboardingDraft = {
  analyticsEnabled: boolean | null;
  experience: ExperienceLevel | null;
  duration: WorkoutDuration | null;
  limitation: LimitationSelection | null;
};

const Stack =
  createNativeStackNavigator<RootStackParamList>();

const initialOnboardingDraft: OnboardingDraft = {
  analyticsEnabled: null,
  experience: null,
  duration: null,
  limitation: null,
};

export function RootNavigator() {
  const [, setOnboardingDraft] =
    useState<OnboardingDraft>(
      initialOnboardingDraft,
    );

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Welcome">
          {({ navigation }) => (
            <WelcomeScreen
              onAnalyticsChoice={(enabled) => {
                setOnboardingDraft((current) => ({
                  ...current,
                  analyticsEnabled: enabled,
                }));

                navigation.navigate("Safety");
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Safety">
          {({ navigation }) => (
            <SafetyScreen
              onContinue={() => {
                navigation.navigate("Experience");
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Experience">
          {({ navigation }) => (
            <ExperienceScreen
              onSelect={(experience) => {
                setOnboardingDraft((current) => ({
                  ...current,
                  experience,
                }));

                navigation.navigate("Duration");
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Duration">
          {({ navigation }) => (
            <DurationScreen
              onSelect={(duration) => {
                setOnboardingDraft((current) => ({
                  ...current,
                  duration,
                }));

                navigation.navigate("Limitations");
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Limitations">
          {({ navigation }) => (
            <LimitationsScreen
              onSubmit={(limitation) => {
                setOnboardingDraft((current) => ({
                  ...current,
                  limitation,
                }));

                navigation.navigate("BaselineIntro");
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="BaselineIntro">
          {() => (
            <BaselineIntroScreen
              onStart={() => {
                // The baseline player is the next feature boundary,
                // so we do not invent workout behavior here.
              }}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}