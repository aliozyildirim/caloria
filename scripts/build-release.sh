#!/bin/bash

# Caloria Release APK Builder
# This script builds a signed release APK

set -e

echo "🚀 Building Caloria Release APK..."
echo ""

# Get version from app.json
VERSION=$(node -p "require('./app.json').expo.version")
echo "📦 Version: $VERSION"
echo ""

# Check if keystore exists
if [ ! -f "android/app/caloria-release-key.keystore" ]; then
    echo "❌ Keystore not found!"
    echo "   Run: bash scripts/generate-keystore.sh"
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd android
./gradlew clean

# Build release APK and AAB
echo "🔨 Building release APK..."
./gradlew assembleRelease

echo "📦 Building release AAB (for Google Play)..."
./gradlew bundleRelease

# Create releases directory
cd ..
mkdir -p releases

# Copy APK with version
APK_SOURCE="android/app/build/outputs/apk/release/app-release.apk"
APK_DEST="releases/caloria-v${VERSION}-release.apk"

# Copy AAB with version
AAB_SOURCE="android/app/build/outputs/bundle/release/app-release.aab"
AAB_DEST="releases/caloria-v${VERSION}-release.aab"

if [ -f "$APK_SOURCE" ] && [ -f "$AAB_SOURCE" ]; then
    cp "$APK_SOURCE" "$APK_DEST"
    cp "$AAB_SOURCE" "$AAB_DEST"
    echo ""
    echo "✅ Build successful!"
    echo "📍 APK Location: $APK_DEST (for testing)"
    echo "📊 APK Size: $(du -h "$APK_DEST" | cut -f1)"
    echo ""
    echo "📍 AAB Location: $AAB_DEST (for Google Play)"
    echo "📊 AAB Size: $(du -h "$AAB_DEST" | cut -f1)"
    echo ""
    echo "🎉 Upload AAB to Google Play Store!"
else
    echo "❌ Build failed! Files not found."
    exit 1
fi
