# Android APK Build Instructions

## Sorunlar Düzeltildi ✅

1. ✅ `usesCleartextTraffic` app.json'dan kaldırıldı
2. ✅ `@types/react-native` paketi kaldırıldı
3. ✅ Android klasörü temizlendi ve yeniden oluşturuldu
4. ✅ Render hatası düzeltildi (getLocalizedText eklendi)

## APK Build Adımları

### Yöntem 1: EAS Build (Önerilen)

```bash
# EAS CLI kur (eğer yoksa)
npm install -g eas-cli

# EAS'a giriş yap
eas login

# Build profili oluştur
eas build:configure

# APK build et
eas build --platform android --profile preview
```

### Yöntem 2: Local Build

```bash
# Prebuild yap
npx expo prebuild --clean

# Android klasörüne git ve build et
cd android
./gradlew assembleRelease

# APK burada olacak:
# android/app/build/outputs/apk/release/app-release.apk
```

### Yöntem 3: Expo Go ile Test

```bash
# Development build
npx expo start

# QR kod ile telefondan test et
```

## Gradle Hatası Çözümü

Eğer "Unresolved reference: serviceOf" hatası alırsan:

1. `android/gradle/wrapper/gradle-wrapper.properties` dosyasını kontrol et
2. Gradle versiyonunu 8.3'e düşür:
   ```
   distributionUrl=https\://services.gradle.org/distributions/gradle-8.3-all.zip
   ```

3. `android/build.gradle` dosyasında:
   ```gradle
   buildscript {
       ext {
           buildToolsVersion = "34.0.0"
           minSdkVersion = 23
           compileSdkVersion = 34
           targetSdkVersion = 34
       }
   }
   ```

## EAS Build Config (eas.json)

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

## Notlar

- APK boyutu: ~50-80 MB olabilir
- İlk build 10-15 dakika sürebilir
- EAS Build cloud'da çalışır, local'de değil
- Local build için Android Studio gerekli
