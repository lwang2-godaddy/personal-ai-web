#!/bin/bash

# Deploy script for Personal AI Web Dashboard
# Usage:
#   ./scripts/deploy.sh           # Deploy to preview
#   ./scripts/deploy.sh --prod    # Deploy to production
#   ./scripts/deploy.sh --help    # Show help

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Show help
show_help() {
    echo -e "${BLUE}Personal AI Web - Deployment Script${NC}"
    echo ""
    echo "Usage:"
    echo "  ./scripts/deploy.sh           Deploy to preview environment"
    echo "  ./scripts/deploy.sh --prod    Deploy to production"
    echo "  ./scripts/deploy.sh --help    Show this help message"
    echo ""
    echo "Options:"
    echo "  --prod, -p     Deploy to production"
    echo "  --skip-lint    Skip linting before deploy"
    echo "  --skip-build   Skip local build check"
    echo "  --help, -h     Show help"
    echo ""
}

# Parse arguments
PRODUCTION=false
SKIP_LINT=false
SKIP_BUILD=false

for arg in "$@"; do
    case $arg in
        --prod|-p)
            PRODUCTION=true
            shift
            ;;
        --skip-lint)
            SKIP_LINT=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $arg${NC}"
            show_help
            exit 1
            ;;
    esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Personal AI Web - Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}Error: Vercel CLI is not installed.${NC}"
    echo "Install it with: npm install -g vercel"
    exit 1
fi

# Check if logged in to Vercel
echo -e "${YELLOW}Checking Vercel authentication...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Vercel.${NC}"
    echo "Run: vercel login"
    exit 1
fi
echo -e "${GREEN}✓ Authenticated with Vercel${NC}"

# Run lint check
if [ "$SKIP_LINT" = false ]; then
    echo ""
    echo -e "${YELLOW}Running lint check...${NC}"
    if npm run lint; then
        echo -e "${GREEN}✓ Lint passed${NC}"
    else
        echo -e "${RED}✗ Lint failed. Fix errors or use --skip-lint to bypass.${NC}"
        exit 1
    fi
fi

# Run build check
if [ "$SKIP_BUILD" = false ]; then
    echo ""
    echo -e "${YELLOW}Running build check...${NC}"
    if npm run build; then
        echo -e "${GREEN}✓ Build successful${NC}"
    else
        echo -e "${RED}✗ Build failed. Fix errors before deploying.${NC}"
        exit 1
    fi
fi

# Deploy
echo ""
if [ "$PRODUCTION" = true ]; then
    echo -e "${YELLOW}Deploying to PRODUCTION...${NC}"
    echo -e "${RED}This will update the live site!${NC}"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi

    vercel --prod

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Production deployment complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo -e "${YELLOW}Deploying to preview...${NC}"

    vercel

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Preview deployment complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "To deploy to production, run:"
    echo -e "  ${BLUE}./scripts/deploy.sh --prod${NC}"
fi
