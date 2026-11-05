// Configurazione Expo ricostruita da app.config dell'APK originale (v1.0.2).
// Icone e splash vengono usate solo se presenti (vedi tools/estrai_asset.py).
const fs = require('fs');
const path = require('path');

const has = (p) => fs.existsSync(path.join(__dirname, p));

// Nome mostrato sotto l'icona. Era quello dell'app originale: cambialo se
// distribuisci l'app (è un marchio registrato di terzi).
const APP_NAME = 'AMERICAN EXPRESS';
const PACKAGE = 'com.emergent.offlineapp.ricwx4';

module.exports = () => ({
  expo: {
    name: APP_NAME,
    slug: 'offline-app-26',
    version: '1.0.2',
    orientation: 'portrait',
    ...(has('assets/images/icon.png') ? { icon: './assets/images/icon.png' } : {}),
    scheme: 'frontend',
    userInterfaceStyle: 'dark',
    backgroundColor: '#060608',
    ios: {
      supportsTablet: true,
      bundleIdentifier: PACKAGE,
      infoPlist: {
        NSCameraUsageDescription: 'Fotografa le tue carte per salvarle',
        NSPhotoLibraryUsageDescription: 'Scegli la foto della tua carta',
        NSFaceIDUsageDescription: 'Sblocca le tue carte con Face ID',
      },
    },
    android: {
      ...(has('assets/images/adaptive-icon.png')
        ? { adaptiveIcon: { foregroundImage: './assets/images/adaptive-icon.png', backgroundColor: '#006FCF' } }
        : {}),
      package: PACKAGE,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.USE_BIOMETRIC',
        'android.permission.USE_FINGERPRINT',
        'android.permission.RECORD_AUDIO',
      ],
      // L'APK originale era versionCode 103: per aggiornarlo serve un numero più alto.
      versionCode: 104,
    },
    web: { bundler: 'metro', output: 'single' },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          ...(has('assets/images/splash-image.png') ? { image: './assets/images/splash-image.png', imageWidth: 200 } : {}),
          resizeMode: 'contain',
          backgroundColor: '#006FCF',
        },
      ],
      'expo-font',
      'expo-image',
      'expo-secure-store',
      'expo-web-browser',
      [
        'expo-image-picker',
        {
          photosPermission: 'Scegli la foto della tua carta',
          cameraPermission: 'Fotografa le tue carte per salvarle',
        },
      ],
      ['expo-local-authentication', { faceIDPermission: 'Sblocca le tue carte con Face ID' }],
    ],
    experiments: { typedRoutes: true },
  },
});
