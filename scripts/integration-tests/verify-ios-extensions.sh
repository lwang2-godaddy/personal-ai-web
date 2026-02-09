#!/bin/bash

# iOS Extensions Build Verification Script
# Verifies that all iOS extensions (Widget, Control Center, Watch) build correctly

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/Users/lwang2/Documents/GitHub/ios/personal/PersonalAIApp/ios"
WORKSPACE="SirCharge.xcworkspace"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "iOS Extensions Build Verification"
echo "=========================================="
echo ""

cd "$PROJECT_DIR"

# Function to check build result
check_build() {
    local scheme="$1"
    local destination="$2"
    local description="$3"

    echo -n "Building $description... "

    if xcodebuild -workspace "$WORKSPACE" \
        -scheme "$scheme" \
        -destination "$destination" \
        -configuration Debug \
        build \
        > /tmp/xcodebuild_${scheme//[^a-zA-Z0-9]/_}.log 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  See log: /tmp/xcodebuild_${scheme//[^a-zA-Z0-9]/_}.log"
        return 1
    fi
}

# Track results
PASSED=0
FAILED=0

echo "1. Building main app with extensions..."
echo "----------------------------------------"

if check_build "SirCharge" "platform=iOS Simulator,name=iPhone 16 Pro" "SirCharge (main app)"; then
    ((PASSED++))
else
    ((FAILED++))
fi

echo ""
echo "2. Verifying embedded extensions..."
echo "----------------------------------------"

# Find DerivedData path
DERIVED_DATA=$(xcodebuild -workspace "$WORKSPACE" -scheme "SirCharge" -showBuildSettings 2>/dev/null | grep -m1 "BUILD_DIR" | awk '{print $3}' | sed 's|/Build/Products||')

if [ -z "$DERIVED_DATA" ]; then
    DERIVED_DATA="$HOME/Library/Developer/Xcode/DerivedData/SirCharge-"*
fi

APP_BUNDLE="$DERIVED_DATA/Build/Products/Debug-iphonesimulator/SirCharge.app"
PLUGINS_DIR="$APP_BUNDLE/PlugIns"

echo -n "Checking VoiceNoteWidgetExtension.appex... "
if [ -d "$PLUGINS_DIR/VoiceNoteWidgetExtension.appex" ]; then
    echo -e "${GREEN}✓ FOUND${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ NOT FOUND${NC}"
    ((FAILED++))
fi

echo -n "Checking VoiceNoteControlExtension.appex... "
if [ -d "$PLUGINS_DIR/VoiceNoteControlExtension.appex" ]; then
    echo -e "${GREEN}✓ FOUND${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ NOT FOUND${NC}"
    ((FAILED++))
fi

echo ""
echo "3. Building Watch app (optional)..."
echo "----------------------------------------"

# Check if watchOS simulator is available
if xcrun simctl list devices | grep -q "Apple Watch"; then
    WATCH_SIM=$(xcrun simctl list devices available | grep "Apple Watch" | head -1 | sed 's/.*(\([^)]*\)).*/\1/')
    if [ -n "$WATCH_SIM" ]; then
        if check_build "SirChargeWatch Watch App" "platform=watchOS Simulator,id=$WATCH_SIM" "Watch App"; then
            ((PASSED++))
        else
            ((FAILED++))
        fi
    else
        echo -e "${YELLOW}⚠ No watchOS simulator available, skipping${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No watchOS simulator available, skipping${NC}"
fi

echo ""
echo "4. Verifying URL scheme registration..."
echo "----------------------------------------"

INFO_PLIST="$PROJECT_DIR/SirCharge/Info.plist"
echo -n "Checking sircharge:// URL scheme... "
if /usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes:0:CFBundleURLSchemes" "$INFO_PLIST" 2>/dev/null | grep -q "sircharge"; then
    echo -e "${GREEN}✓ REGISTERED${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ NOT FOUND${NC}"
    ((FAILED++))
fi

echo ""
echo "=========================================="
echo "Results Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Some checks failed. Review logs above.${NC}"
    exit 1
fi
