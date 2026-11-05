# Istruzioni per l'assistente IA

## Il progetto
- App personale "Le mie carte": caveau di carte (fedeltà, credito ecc.) protetto da PIN, funziona offline.
- Ricostruita da un APK Expo decompilato. Package Android: `com.emergent.offlineapp.ricwx4`.
- Stack: Expo SDK 58, React Native 0.88, React 19, TypeScript, expo-router.
- Chi lavora sul progetto è un principiante: spiega in italiano, in modo semplice, cosa cambi e perché.

## Struttura
- `app/` schermate (expo-router): index, card/[id], editor, viewer, balances, settings, account, pin-setup, _layout.
- `src/context/` stato globale: VaultContext (carte, saldi, sync), LockContext (PIN, biometria), ToastContext.
- `src/components/` componenti grafici. `src/lib/` utilità (api, storage, immagini, formato euro).
- `src/theme.ts` colori, font e `makeStyles`: usali sempre, niente colori scritti a mano.
- `_ref/` è materiale di riferimento (bundle decompilato): non modificarlo e non leggerlo per intero (22 MB).

## Regole
- Cambia il minimo indispensabile per fare quello che ti chiedo. Niente refactoring non richiesti.
- Non cambiare le chiavi di salvataggio (`vault_cards_v1`, `app_pin_hash`, `auth_token`, `auth_email`,
  `last_sync`, `prev_account_email`, `home_logo`, `lock_biometric`) né il formato dei dati salvati.
- Non cambiare il package Android né la logica di hash del PIN.
- Testi dell'interfaccia in italiano.
- Installa le librerie solo con `npx expo install <pacchetto>`, mai con `npm install <pacchetto>`.
- Non salvare mai numero completo della carta o CVV.
- Prima di modifiche su più file, spiega il piano e aspetta il mio ok.

## Comandi
- Avvio: `npx expo start`
- Controllo dei tipi: `npx tsc --noEmit`
- Controllo versioni librerie: `npx expo install --check`
