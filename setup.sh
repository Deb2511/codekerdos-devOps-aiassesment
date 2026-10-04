#!/bin/bash

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     CodeKerdos DevOps Assessment - Automated Setup             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Function to print colored output
print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Step 1: Check prerequisites
print_step "Checking prerequisites..."
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js 16+"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm installed: $NPM_VERSION"
else
    print_error "npm not found"
    exit 1
fi

# Check PostgreSQL or Docker
if command -v psql &> /dev/null; then
    print_success "PostgreSQL client installed"
    USING_LOCAL_PG=true
elif command -v docker &> /dev/null; then
    print_success "Docker installed"
    USING_DOCKER=true
else
    print_warning "Neither PostgreSQL nor Docker found. You may need to set up database manually."
fi

echo ""

# Step 2: Setup Database
print_step "Setting up database..."
echo ""

if [ "$USING_DOCKER" = true ]; then
    print_step "Starting PostgreSQL with Docker..."
    docker-compose up -d
    print_success "Docker container started"
    sleep 5
    print_success "Database initialized (waited 5 seconds)"
elif [ "$USING_LOCAL_PG" = true ]; then
    print_step "Creating PostgreSQL database..."
    if createdb -U postgres coderkerdos 2>/dev/null; then
        print_success "Database created"
    else
        print_warning "Database may already exist (that's OK)"
    fi
else
    print_warning "Skipping database setup - please create it manually"
fi

echo ""

# Step 3: Setup Backend
print_step "Setting up backend..."
echo ""

cd "$PROJECT_DIR/backend"

# Check if .env exists
if [ ! -f .env ]; then
    print_step "Creating .env file..."
    cp .env.example .env
    print_success ".env created"

    print_warning "⚠️  IMPORTANT: Edit backend/.env and add your ANTHROPIC_API_KEY"
    print_warning "   Get key from: https://console.anthropic.com"
    read -p "Press Enter after you've added your API key to backend/.env... "
else
    print_success ".env already exists"
fi

# Check .env has API key
if grep -q "ANTHROPIC_API_KEY=sk-ant-" .env; then
    print_success "ANTHROPIC_API_KEY is configured"
else
    print_warning "ANTHROPIC_API_KEY not found or not set properly in .env"
    print_warning "Please update backend/.env with your key before starting"
fi

# Install dependencies
if [ ! -d node_modules ]; then
    print_step "Installing backend dependencies..."
    npm install > /dev/null 2>&1
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

echo ""

# Step 4: Setup Frontend
print_step "Setting up frontend..."
echo ""

cd "$PROJECT_DIR/frontend"

# Check if .env exists
if [ ! -f .env ]; then
    print_step "Creating .env file..."
    cp .env.example .env
    print_success ".env created (using defaults)"
else
    print_success ".env already exists"
fi

# Install dependencies
if [ ! -d node_modules ]; then
    print_step "Installing frontend dependencies..."
    npm install --legacy-peer-deps > /dev/null 2>&1
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

echo ""

# Step 5: Verification
print_step "Verifying setup..."
echo ""

cd "$PROJECT_DIR"

# Check backend files
if [ -d backend/node_modules ] && [ -f backend/.env ]; then
    print_success "Backend ready"
else
    print_error "Backend not ready"
    exit 1
fi

# Check frontend files
if [ -d frontend/node_modules ] && [ -f frontend/.env ]; then
    print_success "Frontend ready"
else
    print_error "Frontend not ready"
    exit 1
fi

# Check database
if [ "$USING_DOCKER" = true ] || [ "$USING_LOCAL_PG" = true ]; then
    if psql -U postgres -d coderkerdos -c "SELECT 1" > /dev/null 2>&1; then
        print_success "Database accessible"
    else
        print_warning "Could not verify database access (may be OK if just created)"
    fi
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete! ✓                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

print_step "Next Steps:"
echo ""
echo "1️⃣  In Terminal 1 - Start Backend:"
echo "   cd $PROJECT_DIR/backend"
echo "   npm run dev"
echo ""
echo "2️⃣  In Terminal 2 - Start Frontend:"
echo "   cd $PROJECT_DIR/frontend"
echo "   npm start"
echo ""
echo "3️⃣  Open Browser:"
echo "   http://localhost:3000"
echo ""
echo "⚠️  Remember:"
echo "   • Add your ANTHROPIC_API_KEY to backend/.env"
echo "   • Keep database running (Docker or PostgreSQL)"
echo "   • Open two separate terminal windows"
echo ""
print_success "Setup complete! Ready to test CodeKerdos 🚀"
