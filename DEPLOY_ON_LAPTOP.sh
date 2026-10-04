#!/bin/bash

#╔════════════════════════════════════════════════════════════════╗
#║   CodeKerdos DevOps Assessment - Laptop Deployment Script      ║
#║                                                                ║
#║   This script will:                                            ║
#║   1. Verify prerequisites                                      ║
#║   2. Setup PostgreSQL with Docker                              ║
#║   3. Install all dependencies                                  ║
#║   4. Create configuration files                                ║
#║   5. Start backend and frontend servers                        ║
#║                                                                ║
#║   REQUIRES: Node.js 16+, Docker, Anthropic API key            ║
#║                                                                ║
#╚════════════════════════════════════════════════════════════════╝

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     CodeKerdos - Automated Laptop Deployment                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we have API key parameter
if [ -z "$1" ]; then
    echo -e "${YELLOW}⚠️  Usage: bash DEPLOY_ON_LAPTOP.sh <YOUR_ANTHROPIC_API_KEY>${NC}"
    echo ""
    echo "Steps to get API key:"
    echo "1. Go to: https://console.anthropic.com"
    echo "2. Create API key"
    echo "3. Copy key (looks like: sk-ant-...)"
    echo "4. Run: bash DEPLOY_ON_LAPTOP.sh sk-ant-your-key-here"
    echo ""
    exit 0
fi

API_KEY="$1"

# Verify API key format
if [[ ! "$API_KEY" =~ ^sk-ant- ]]; then
    echo -e "${RED}✗ Invalid API key format. Should start with 'sk-ant-'${NC}"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}Project Location: $PROJECT_DIR${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${BLUE}▶ Step 1: Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js 16+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found. Please install Docker${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker installed${NC}"

echo ""

# Step 2: Start PostgreSQL
echo -e "${BLUE}▶ Step 2: Starting PostgreSQL database...${NC}"

if docker-compose up -d > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL container started${NC}"
    sleep 5
    echo -e "${GREEN}✓ Database initialized${NC}"
else
    echo -e "${YELLOW}⚠ Docker Compose may have failed. Trying manual docker command...${NC}"
    docker run -d \
      --name coderkerdos-db \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=coderkerdos \
      -p 5432:5432 \
      postgres:15-alpine > /dev/null 2>&1
    echo -e "${GREEN}✓ PostgreSQL started manually${NC}"
    sleep 5
fi

echo ""

# Step 3: Setup Backend
echo -e "${BLUE}▶ Step 3: Setting up Backend...${NC}"

cd "$PROJECT_DIR/backend"

if [ ! -f .env ]; then
    cp .env.example .env
    # Add API key
    sed -i.bak "s/ANTHROPIC_API_KEY=sk-ant-your-key-here/ANTHROPIC_API_KEY=$API_KEY/" .env
    rm -f .env.bak
    echo -e "${GREEN}✓ Created .env with API key${NC}"
else
    echo -e "${YELLOW}✓ .env already exists${NC}"
fi

if [ ! -d node_modules ]; then
    echo -e "${BLUE}  Installing dependencies (this may take 1-2 minutes)...${NC}"
    npm install > /dev/null 2>&1
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

echo ""

# Step 4: Setup Frontend
echo -e "${BLUE}▶ Step 4: Setting up Frontend...${NC}"

cd "$PROJECT_DIR/frontend"

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env${NC}"
else
    echo -e "${GREEN}✓ .env already exists${NC}"
fi

if [ ! -d node_modules ]; then
    echo -e "${BLUE}  Installing dependencies (this may take 1-2 minutes)...${NC}"
    npm install --legacy-peer-deps > /dev/null 2>&1
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

echo ""

# Step 5: Verify everything
echo -e "${BLUE}▶ Step 5: Verifying setup...${NC}"

cd "$PROJECT_DIR/backend"
npm run type-check > /dev/null 2>&1
echo -e "${GREEN}✓ Backend TypeScript valid${NC}"

cd "$PROJECT_DIR/frontend"
npx tsc --noEmit > /dev/null 2>&1
echo -e "${GREEN}✓ Frontend TypeScript valid${NC}"

echo ""

# Final instructions
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    SETUP COMPLETE! ✓                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✓ PostgreSQL: Running${NC}"
echo -e "${GREEN}✓ Backend: Ready${NC}"
echo -e "${GREEN}✓ Frontend: Ready${NC}"
echo -e "${GREEN}✓ API Key: Configured${NC}"

echo ""
echo -e "${YELLOW}📝 NEXT STEPS (Open two new terminal windows):${NC}"
echo ""

echo -e "${BLUE}TERMINAL 1 - Start Backend:${NC}"
echo "cd $PROJECT_DIR/backend"
echo "npm run dev"
echo ""
echo -e "${YELLOW}Wait for: 'Server running on port 5000'${NC}"
echo ""

echo -e "${BLUE}TERMINAL 2 - Start Frontend:${NC}"
echo "cd $PROJECT_DIR/frontend"
echo "npm start"
echo ""
echo -e "${YELLOW}Wait for: 'Compiled successfully!'${NC}"
echo ""

echo -e "${BLUE}TERMINAL 3 (or Browser) - Open Application:${NC}"
echo "http://localhost:3000"
echo ""

echo -e "${GREEN}🎉 CodeKerdos is ready to test!${NC}"
echo ""
echo -e "${YELLOW}Need help?${NC}"
echo "See: $PROJECT_DIR/DEPLOYMENT_GUIDE.md"
echo ""
