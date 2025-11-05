module.exports = ({ config }) => ({
  ...config,
  expo: {
    ...(config.expo || {}),
    name: "OpenBirding",
    slug: "OpenBirding",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/logo.png",
    scheme: "openbirding",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      bundleIdentifier: "com.rawcomposition.openbirding",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/logo.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      permissions: ["INTERNET"],
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
          // 👇 Now the plugin receives the actual secret from env
          RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOADS_TOKEN || process.env.MAPBOX_DOWNLOAD_TOKEN,
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
