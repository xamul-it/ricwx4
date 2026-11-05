// Installa tutte le dipendenze con le versioni compatibili con Expo SDK 58.
// Uso: npm install  &&  npm run setup
const { execSync } = require('child_process');

const deps = [
  'react', 'react-dom', 'react-native', 'react-native-web',
  'expo-router', 'expo-constants', 'expo-linking', 'expo-status-bar',
  'expo-splash-screen', 'expo-font', 'expo-image', 'expo-secure-store',
  'expo-web-browser', 'expo-image-picker', 'expo-local-authentication',
  'expo-crypto', 'expo-haptics', 'expo-file-system', 'expo-linear-gradient',
  'expo-blur', 'expo-brightness', '@expo/vector-icons',
  '@expo-google-fonts/cormorant', '@expo-google-fonts/dm-sans',
  '@react-native-async-storage/async-storage',
  'react-native-reanimated', 'react-native-worklets',
  'react-native-gesture-handler', 'react-native-safe-area-context',
  'react-native-screens', 'react-native-keyboard-controller',
  '@tanstack/react-query',
];
const dev = ['typescript', '@types/react'];

// Con app.config.js (config dinamica) "expo install" non riesce ad aggiungere da solo
// i plugin e termina con errore anche se i pacchetti sono stati installati:
// i plugin sono già dichiarati in app.config.js, quindi l'errore si può ignorare.
const run = (cmd) => {
  console.log('\n> ' + cmd);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    console.warn('\n[setup] Il comando ha segnalato un errore, proseguo. Controlla i messaggi qui sopra.');
  }
};
run('npx expo install ' + deps.join(' '));
run('npx expo install ' + dev.join(' ') + ' -- --save-dev');
run('npx expo install --check');
