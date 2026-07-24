#!/bin/bash

# --- CONFIGURATION ---
REPO_URL="https://github.com/AntonCapusta25/AutoFlowWebProd.git" # User should update this
TARGET_DIR="$HOME/infra-agent"
DEPLOY_TOKEN=$(openssl rand -base64 32)

echo "🚀 Starting Infrastructure Agent Setup..."

# 1. Install Docker if not present (Mac specific)
if ! command -v docker &> /dev/null; then
    echo "📦 Docker not found. Please install Docker Desktop for Mac first."
    echo "Opening Docker download page..."
    open https://www.docker.com/products/docker-desktop
    exit 1
fi

# 2. Clone/Prepare Directory
if [ ! -d "$TARGET_DIR" ]; then
    echo "📂 Cloning repository..."
    git clone "$REPO_URL" "$TARGET_DIR"
fi

cd "$TARGET_DIR"

# 3. Create .env
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    echo "DEPLOY_TOKEN=$DEPLOY_TOKEN" > .env
    echo "OLLAMA_URL=http://ollama:11434/api/generate" >> .env
fi

# 4. Start the stack
echo "🏗️ Building and starting containers..."
docker compose up -d --build

# 5. Output instructions
echo ""
echo "✅ SETUP COMPLETE!"
echo "--------------------------------------------------"
echo "YOUR DEPLOY TOKEN: $DEPLOY_TOKEN"
echo "URL FOR GITHUB WEBHOOK: http://<MAC-MINI-IP>:9000/deploy"
echo "--------------------------------------------------"
echo "Next steps: Add DEPLOY_TOKEN to your GitHub Secrets."
