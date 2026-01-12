import 'dotenv/config';

export default {
  expo: {
    name: "Dwellr",
    slug: "dwellr",
    scheme: "dwellr",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    icon: "./assets/images/icon.png",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.anirudh.dwellr" // Added bundle identifier
    },
    android: {
      package: "com.anirudh.dwellr",
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY // Reads from .env
        }
      },
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
        backgroundColor: "#E6F4FE"
      }
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-notifications",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff",
          "dark": {
            "backgroundColor": "#000000"
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: "ca3eb4ae-f7a7-4f6e-abfe-c6f4641899d2"
      }
    }
  }
};