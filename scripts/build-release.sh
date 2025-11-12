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

# Build release APK
echo "🔨 Building release APK..."
./gradlew assembleRelease

# Create releases directory
cd ..
mkdir -p releases

# Copy APK with version
APK_SOURCE="android/app/build/outputs/apk/release/app-release.apk"
APK_DEST="releases/caloria-v${VERSION}-release.apk"

if [ -f "$APK_SOURCE" ]; then
    cp "$APK_SOURCE" "$APK_DEST"
    echo ""
    echo "✅ Build successful!"
    echo "📍 APK Location: $APK_DEST"
    echo "📊 APK Size: $(du -h "$APK_DEST" | cut -f1)"
    echo ""
    echo "🎉 Ready to upload to Google Play Store!"
else
    echo "❌ Build failed! APK not found."
    exit 1
fi
