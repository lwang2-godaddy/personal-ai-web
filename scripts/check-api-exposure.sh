#!/bin/bash

# ============================================================================
# Security Check: API Key Exposure Prevention
# ============================================================================
# This script checks for dangerous patterns that could expose API keys
# to the browser. Run before commits and in CI/CD.
#
# Usage:
#   ./scripts/check-api-exposure.sh
#
# Exit codes:
#   0 = No issues found
#   1 = Security violations detected
# ============================================================================

set -e

echo "🔒 Security Check: Scanning for API key exposure risks..."
echo ""

ISSUES_FOUND=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to report violation
report_violation() {
  local CHECK_NAME="$1"
  local FILES="$2"

  if [ -n "$FILES" ]; then
    echo -e "${RED}❌ SECURITY VIOLATION: $CHECK_NAME${NC}"
    echo "$FILES" | while read -r file; do
      echo "   📄 $file"
    done
    echo ""
    ISSUES_FOUND=1
  fi
}

# ============================================================================
# Check 1: OpenAIService imports in client code
# ============================================================================
echo "🔍 Check 1: OpenAIService imports in client code..."
# Find client files (exclude API routes, lib/api/, and .server.ts files)
CLIENT_FILES=$(find lib components app -name '*.ts' -o -name '*.tsx' 2>/dev/null | grep -v 'app/api/' | grep -v 'lib/api/' | grep -v 'lib/services/.*client\.ts' | grep -v '\.server\.ts$' || true)

if [ -n "$CLIENT_FILES" ]; then
  OPENAI_CLIENT=$(echo "$CLIENT_FILES" | xargs grep -l "from '@/lib/api/openai/client'" 2>/dev/null || true)
  if [ -n "$OPENAI_CLIENT" ]; then
    report_violation "OpenAIService imported in client code" "$OPENAI_CLIENT"
    echo "   💡 Fix: Use API routes instead (app/api/**/route.ts)"
    echo "   Example: fetch('/api/transcribe', { method: 'POST', body: formData })"
    echo ""
  fi
fi

# ============================================================================
# Check 2: Direct OpenAI SDK imports
# ============================================================================
echo "🔍 Check 2: Direct OpenAI SDK imports..."
if [ -n "$CLIENT_FILES" ]; then
  OPENAI_SDK=$(echo "$CLIENT_FILES" | xargs grep -l "from 'openai'" 2>/dev/null || true)
  if [ -n "$OPENAI_SDK" ]; then
    report_violation "OpenAI SDK imported directly" "$OPENAI_SDK"
    echo "   💡 Fix: Never import 'openai' package in client code"
    echo "   Use API routes that call OpenAIService on the server"
    echo ""
  fi
fi

# ============================================================================
# Check 3: Pinecone SDK imports
# ============================================================================
echo "🔍 Check 3: Pinecone SDK imports..."
if [ -n "$CLIENT_FILES" ]; then
  PINECONE_SDK=$(echo "$CLIENT_FILES" | xargs grep -l "from '@pinecone-database" 2>/dev/null || true)
  if [ -n "$PINECONE_SDK" ]; then
    report_violation "Pinecone SDK imported in client code" "$PINECONE_SDK"
    echo "   💡 Fix: Use API routes that call PineconeService on the server"
    echo ""
  fi
fi

# ============================================================================
# Check 4: Firebase Admin SDK imports
# ============================================================================
echo "🔍 Check 4: Firebase Admin SDK imports..."
if [ -n "$CLIENT_FILES" ]; then
  FIREBASE_ADMIN=$(echo "$CLIENT_FILES" | xargs grep -l "from 'firebase-admin'" 2>/dev/null || true)
  if [ -n "$FIREBASE_ADMIN" ]; then
    report_violation "Firebase Admin SDK imported in client code" "$FIREBASE_ADMIN"
    echo "   💡 Fix: Use regular firebase SDK for client"
    echo "   firebase-admin is for server only (API routes)"
    echo ""
  fi
fi

# ============================================================================
# Check 5: API key environment variables in client code
# ============================================================================
echo "🔍 Check 5: Secret API keys in environment variables..."
if [ -n "$CLIENT_FILES" ]; then
  ENV_SECRETS=$(echo "$CLIENT_FILES" | xargs grep -l "process\.env\.OPENAI_API_KEY\|process\.env\.PINECONE_API_KEY\|process\.env\.FIREBASE_ADMIN" 2>/dev/null || true)
  if [ -n "$ENV_SECRETS" ]; then
    report_violation "Secret API keys accessed in client code" "$ENV_SECRETS"
    echo "   💡 Fix: Never access secret env vars outside API routes"
    echo "   Use API routes and pass data through authenticated requests"
    echo ""
  fi
fi

# ============================================================================
# Check 6: Hardcoded API keys (just in case)
# ============================================================================
echo "🔍 Check 6: Hardcoded API keys..."
# Check all files including lib/api/ since hardcoded keys are NEVER OK
ALL_FILES=$(find lib components app -name '*.ts' -o -name '*.tsx' 2>/dev/null | grep -v '.disabled' || true)
if [ -n "$ALL_FILES" ]; then
  # OpenAI keys start with sk-
  HARDCODED_OPENAI=$(echo "$ALL_FILES" | xargs grep -l "sk-[a-zA-Z0-9]\{20,\}" 2>/dev/null || true)
  if [ -n "$HARDCODED_OPENAI" ]; then
    report_violation "Hardcoded OpenAI API key detected!" "$HARDCODED_OPENAI"
    echo "   💡 Fix: IMMEDIATELY remove hardcoded keys and use environment variables"
    echo "   Store in .env.local (server-only, NOT NEXT_PUBLIC_*)"
    echo ""
  fi

  # Firebase private keys
  HARDCODED_FIREBASE=$(echo "$ALL_FILES" | xargs grep -l "\"private_key\":" 2>/dev/null || true)
  if [ -n "$HARDCODED_FIREBASE" ]; then
    report_violation "Hardcoded Firebase private key detected!" "$HARDCODED_FIREBASE"
    echo "   💡 Fix: IMMEDIATELY remove and use environment variables"
    echo ""
  fi
fi

# ============================================================================
# Check 7: .env.local has correct prefixes
# ============================================================================
echo "🔍 Check 7: Environment variable prefixes..."
if [ -f ".env.local" ]; then
  # Check for secrets with NEXT_PUBLIC_ prefix (WRONG!)
  BAD_PUBLIC_VARS=$(grep "NEXT_PUBLIC_.*\(OPENAI_API_KEY\|PINECONE_API_KEY\|FIREBASE_ADMIN\|PRIVATE_KEY\)" .env.local 2>/dev/null || true)
  if [ -n "$BAD_PUBLIC_VARS" ]; then
    echo -e "${RED}❌ SECURITY VIOLATION: Secret keys with NEXT_PUBLIC_ prefix${NC}"
    echo "   📄 .env.local"
    echo "$BAD_PUBLIC_VARS" | while read -r line; do
      echo "      $line"
    done
    echo ""
    echo "   💡 Fix: Remove NEXT_PUBLIC_ prefix from secret keys"
    echo "   NEXT_PUBLIC_ variables are exposed to the browser!"
    echo "   Secrets should NOT have this prefix."
    echo ""
    ISSUES_FOUND=1
  fi
fi

# ============================================================================
# Results
# ============================================================================
echo ""
echo "========================================="
if [ $ISSUES_FOUND -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed! No API key exposure detected.${NC}"
  echo "========================================="
  exit 0
else
  echo -e "${RED}❌ Security violations found!${NC}"
  echo "========================================="
  echo ""
  echo "⚠️  CRITICAL: Fix these issues before committing or deploying!"
  echo ""
  echo "📚 Read full security guide:"
  echo "   docs/security/PREVENTING_API_KEY_EXPOSURE.md"
  echo ""
  exit 1
fi
