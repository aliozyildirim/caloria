# Caloria Release Build Guide

## İlk Kurulum

### 1. Keystore Oluştur (Sadece İlk Kez)

```bash
bash scripts/generate-keystore.sh
```

⚠️ **ÖNEMLİ:** 
- Keystore dosyasını (`android/app/caloria-release-key.keystore`) güvenli bir yerde sakla
- Şifreyi unutma: `Caloria2024!SecureKey`
- Her uygulama güncellemesinde aynı keystore gerekli
- Keystore'u kaybedersen uygulamayı güncelleyemezsin!

### 2. Release APK Oluştur

```bash
bash scripts/build-release.sh
```

APK: `releases/caloria-v1.0.0-release.apk`

## Manuel Build

```bash
# Java 17 kullan
export JAVA_HOME=$(/usr/libexec/java_home -v 17)

# Build
cd android
./gradlew clean assembleRelease
```

APK: `android/app/build/outputs/apk/release/app-release.apk`

## Versiyon Güncelleme

1. `app.json` dosyasında version'ı artır:
   ```json
   {
     "expo": {
       "version": "1.0.1"
     }
   }
   ```

2. Build et:
   ```bash
   bash scripts/build-release.sh
   ```

3. Yeni APK: `releases/caloria-v1.0.1-release.apk`

## Google Play Store'a Yükleme

1. [Google Play Console](https://play.google.com/console)'a git
2. Uygulamayı oluştur (ilk kez)
3. Release > Production > Create new release
4. APK'yı yükle: `releases/caloria-vX.X.X-release.apk`
5. Release notes ekle
6. Review ve publish

## Sorun Giderme

### Java Version Hatası
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
java -version  # openjdk version "17" görmeli
```

### Keystore Bulunamadı
```bash
bash scripts/generate-keystore.sh
```

### Build Başarısız
```bash
cd android
./gradlew clean
cd ..
bash scripts/build-release.sh
```

## Güvenlik

- ✅ Keystore dosyası `.gitignore`'da
- ✅ Şifreler `gradle.properties`'de (git'e commit edilmemeli)
- ✅ Release APK'lar `releases/` klasöründe

## Notlar

- İlk build 10-15 dakika sürebilir
- APK boyutu: ~50-80 MB
- Minimum Android: 6.0 (API 23)
- Target Android: 14 (API 34)
