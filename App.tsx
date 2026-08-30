import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { defaultIdentityService } from "./src/auth/default-identity-service";
import { IdentityBootstrap } from "./src/auth/identity-bootstrap";
import type { IdentityService } from "./src/auth/identity-service";
import { RootNavigator } from "./src/navigation/RootNavigator";

type AppRootProps = {
  identityService?: IdentityService;
};

export function AppRoot({
  identityService = defaultIdentityService,
}: AppRootProps) {
  return (
    <IdentityBootstrap service={identityService}>
      <SafeAreaProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </IdentityBootstrap>
  );
}

export default function App() {
  return <AppRoot />;
}
