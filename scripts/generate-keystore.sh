#!/bin/bash

# Caloria Release Keystore Generator
# This script generates a keystore for signing release APKs

echo "🔐 Generating Caloria Release Keystore..."

keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore android/app/caloria-release-key.keystore \
  -alias caloria-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "Caloria2024!SecureKey" \
  -keypass "Caloria2024!SecureKey" \
  -dname "CN=Caloria, OU=Mobile, O=Caloria, L=Istanbul, ST=Istanbul, C=TR"

echo "✅ Keystore generated successfully!"
echo "📍 Location: android/app/caloria-release-key.keystore"
echo ""
echo "⚠️  IMPORTANT: Keep this keystore file safe!"
echo "   - Never commit it to git"
echo "   - Store it in a secure location"
echo "   - You'll need it for every app update"
