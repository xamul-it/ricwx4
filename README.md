# Le mie carte (com.emergent.offlineapp.ricwx4) – sorgente ricostruito

Questo è il progetto **Expo / React Native (TypeScript)** dell'app, ricostruito dal bundle Hermes decompilato
(`_ref/output.js.txt`) dell'APK 1.0.2. Testi, schermate, colori, dimensioni, chiavi di salvataggio e chiamate
al server sono quelli dell'originale. La struttura delle cartelle e i nomi dei file, invece, sono nuovi: l'originale non si può recuperare.

## Requisiti
- Node.js 20 o superiore
- Python 3 (solo per estrarre le immagini dall'APK)
- Per compilare in locale: Android Studio (SDK + JDK 17). In alternativa: un account Expo con `eas build`.

## Avvio
```powershell
npm install
npm run setup                                   # installa le dipendenze compatibili con Expo SDK 58
python tools/estrai_asset.py C:\percorso\app.apk  # copia le immagini originali in assets/images
npx expo start                                  # oppure: npx expo run:android
```
Se salti `estrai_asset.py`, l'app funziona lo stesso con le immagini provvisorie già incluse: logo, sfondo del blocco e texture delle carte.

## Creare l'APK
- **Con EAS**: `npx eas build -p android --profile preview`, che produce un `.apk` (vedi `eas.json`).
- **In locale**: `npx expo prebuild -p android`, poi `cd android` e `.\gradlew assembleRelease`.

⚠️ **Chiave di firma.** Per installare questa versione *sopra* l'app già presente sul telefono, senza perdere
le carte salvate, serve la stessa chiave usata da Emergent per l'APK originale. Senza quella chiave devi
disinstallare la vecchia app, e i dati locali si perdono. Prima di disinstallare, se avevi un account, sincronizza: le carte restano sul server.
`versionCode` è già 104, cioè più alto del 103 dell'originale.

## Struttura
```
app/                      schermate (expo-router)
  _layout.tsx             provider, font, Stack e schermata di blocco
  index.tsx               home: pila di carte, stato sincronizzazione
  card/[id].tsx           dettaglio carta ed eliminazione
  editor.tsx              nuova o modifica carta (foto, tipo, colore, ultime 4 cifre, scadenza, nota)
  viewer.tsx              carta a schermo intero, ruotata e con luminosità al massimo
  balances.tsx            saldi per carta e saldo totale
  settings.tsx            account/cloud, logo, PIN, biometria
  account.tsx             login e registrazione
  pin-setup.tsx           scelta e conferma del PIN
src/
  theme.ts                palette, font, makeStyles
  types.ts                modello Card
  context/VaultContext    carte, saldi, logo, account e sincronizzazione
  context/LockContext     PIN (SHA-256 "lmc-vault:"+PIN in SecureStore), biometria, nuovo blocco dopo 60 s
  context/ToastContext    notifiche a comparsa
  components/             CardFace, CardStack, PinPad, LockGate, Button, ScreenHeader, usePhotoPicker, ErrorBoundary
  lib/                    api, storage, images (expo-file-system), upload, format (EUR), haptics, nav, cardMeta
backend/                  server sostitutivo facoltativo (FastAPI + SQLite)
tools/estrai_asset.py     estrae le immagini originali dall'APK (riconosciute dall'MD5)
```

## Dati salvati (uguali all'originale)
| Dove | Chiave | Contenuto |
|---|---|---|
| AsyncStorage | `vault_cards_v1` | elenco delle carte (JSON) |
| AsyncStorage | `auth_email`, `last_sync`, `prev_account_email`, `home_logo`, `lock_biometric` | account, ultima sincronizzazione, logo, biometria |
| SecureStore | `app_pin_hash` | hash del PIN |
| SecureStore | `auth_token` | token del server |
| File | `documents/cards/*.jpg` | foto delle carte e del logo |

## Sincronizzazione nel cloud
L'app usa ancora il server originale `https://offline-app-26.emergent.host/api`. Probabilmente smetterà di funzionare
perché è legato al progetto Emergent. L'app resta comunque **offline al 100%**. Per avere un tuo server:
```powershell
cd backend
python -m venv .venv; .venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001
```
Poi crea `.env` nella cartella del progetto con `EXPO_PUBLIC_API_URL=http://<IP-del-PC>:8001/api` e riavvia `npx expo start`.

## Cosa è ricostruito a mano
- **Font**: Cormorant e DM Sans arrivano dai pacchetti `@expo-google-fonts`. Nell'originale erano file `.ttf` locali, ma sono gli stessi caratteri.
- **Icone**: `@expo/vector-icons` (Ionicons) al posto di `@react-native-vector-icons/ionicons`. I nomi delle icone non cambiano.
- **Logica**: dove il bytecode Hermes non permetteva una lettura esatta (alcuni ritardi, ordine di alcune chiamate),
  ho scelto il comportamento più plausibile. Le eventuali differenze sono minime.
- **Configurazione EAS**: `owner` e `projectId` di Emergent sono stati tolti. Al primo `eas build` ne verrà creato uno nuovo.
