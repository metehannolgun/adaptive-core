import { registerRootComponent } from "expo";
import * as SplashScreen from "expo-splash-screen";

import App from "./App";

void SplashScreen.preventAutoHideAsync();
registerRootComponent(App);
