#!/bin/bash

# Image Service API Key Generation Script
# This script generates secure API keys and HMAC secrets for the image service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to generate a secure base64url encoded key
generate_api_key() {
    local prefix="$1"
    local key=$(openssl rand -base64 32 | tr -d "=+/" | tr -d "\n")
    echo "${prefix}_${key}"
}

# Function to generate HMAC secret
generate_hmac_secret() {
    openssl rand -base64 64 | tr -d "\n"
}

# Function to print colored output
print_colored() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
}

# Header
clear
print_colored "$BLUE" "======================================"
print_colored "$BLUE" "  Image Service Key Generator"
print_colored "$BLUE" "======================================"
echo

# Generate keys
print_colored "$YELLOW" "🔑 Generating secure API keys..."
echo

DISCORD_KEY=$(generate_api_key "discord")
CLAUDE_KEY=$(generate_api_key "claude")
HMAC_SECRET=$(generate_hmac_secret)

# Current timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Create .env content
ENV_CONTENT="# Image Service Authentication Keys
# Generated on: ${TIMESTAMP}
# 
# SECURITY NOTE: Keep these keys secure and never commit to version control

# Server Configuration
PORT=3001
NODE_ENV=development

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DATABASE=0

# Authentication Keys
DISCORD_BOT_API_KEY=${DISCORD_KEY}
CLAUDE_CODE_API_KEY=${CLAUDE_KEY}
HMAC_SECRET=${HMAC_SECRET}

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Optional: Image Service Configuration
IMAGE_SERVICE_UPLOAD_MAX_FILE_SIZE=10485760
IMAGE_SERVICE_UPLOAD_MAX_FILES=10
IMAGE_SERVICE_RATE_LIMIT_MAX_FILES_PER_HOUR=50"

# Display generated keys
print_colored "$GREEN" "✅ Keys generated successfully!"
echo
print_colored "$YELLOW" "📋 Generated Keys:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
print_colored "$BLUE" "Discord Bot API Key:"
print_colored "$GREEN" "$DISCORD_KEY"
echo
print_colored "$BLUE" "Claude Code API Key:"
print_colored "$GREEN" "$CLAUDE_KEY"
echo
print_colored "$BLUE" "HMAC Secret:"
print_colored "$GREEN" "$HMAC_SECRET"
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Ask user what to do with the keys
echo
print_colored "$YELLOW" "🤔 What would you like to do with these keys?"
echo
echo "1) Save to .env file (overwrites existing)"
echo "2) Save to .env.generated file (safe backup)"
echo "3) Display only (you copy manually)"
echo "4) Save to specific file"
echo
read -p "Choose option (1-4): " option

case $option in
    1)
        echo "$ENV_CONTENT" > .env
        print_colored "$GREEN" "✅ Keys saved to .env file"
        print_colored "$YELLOW" "⚠️  Make sure to restart your application to load new keys"
        ;;
    2)
        echo "$ENV_CONTENT" > .env.generated
        print_colored "$GREEN" "✅ Keys saved to .env.generated file"
        print_colored "$YELLOW" "💡 Copy the keys from .env.generated to your .env file"
        ;;
    3)
        print_colored "$BLUE" "📋 Keys displayed above - copy them manually to your .env file"
        ;;
    4)
        read -p "Enter filename: " filename
        echo "$ENV_CONTENT" > "$filename"
        print_colored "$GREEN" "✅ Keys saved to $filename"
        ;;
    *)
        print_colored "$RED" "❌ Invalid option. Keys displayed above - copy manually."
        ;;
esac

echo
print_colored "$YELLOW" "🔐 Security Reminders:"
echo "• Never commit these keys to version control"
echo "• Store them securely (password manager, vault, etc.)"
echo "• Rotate keys regularly in production"
echo "• Use different keys for different environments"
echo
print_colored "$BLUE" "🚀 Usage in Discord Bot:"
echo "headers: { 'x-api-key': '$DISCORD_KEY' }"
echo
print_colored "$BLUE" "🚀 Usage in GitHub Actions:"
echo "1. Add CLAUDE_CODE_API_KEY to repository secrets"
echo "2. Use: headers: { 'x-api-key': '\${{ secrets.CLAUDE_CODE_API_KEY }}' }"
echo
print_colored "$GREEN" "🎉 Setup complete! Your image service is ready for secure authentication."