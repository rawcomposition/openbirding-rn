module.exports = ({ config }) => ({
  ...config,
  expo: {
    ...(config.expo || {}),
    name: "OpenBirding",
    slug: "OpenBirding",
    version: "1.5.2",
    orientation: "portrait",
    icon: "./assets/images/logo.png",
    scheme: "openbirding",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        LSApplicationQueriesSchemes: ["mailto", "merlinbirdid", "comgooglemaps", "om", "waze", "maps"],
      },
      bundleIdentifier: "com.rawcomposition.openbirding",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/logo-android.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      permissions: ["INTERNET", "ACCESS_FINE_LOCATION"],
      package: "com.rawcomposition.openbirding",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/logo.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/logo.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#1b2336",
        },
      ],
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsImpl: "mapbox",
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "This app uses location to show your position on the map and find nearby hotspots.",
        },
      ],
      "expo-sqlite",
      "expo-web-browser",
    ],
    experiments: { typedRoutes: true },
    extra: {
      router: {},
      eas: { projectId: "2944a151-98b6-4d2a-9104-65facf9def35" },
      MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,
    },
    updates: {
      url: "https://u.expo.dev/2944a151-98b6-4d2a-9104-65facf9def35",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
  },
});
