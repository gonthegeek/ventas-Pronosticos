#!/bin/bash

# Setup script for local development
# This script helps configure the Firebase project for local development

echo "🔧 Setting up Firebase configuration for local development..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
        echo "❗ Please edit .env file with your actual Firebase credentials"
        exit 0
    else
        echo "❌ .env.example not found"
        exit 1
    fi
fi

# Read environment variables from .env file
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Loaded environment variables from .env"
else
    echo "❌ .env file not found"
    exit 1
fi

# Check if .firebaserc exists, if not copy from template and update with project ID
if [ ! -f ".firebaserc" ]; then
    if [ -f ".firebaserc.template" ]; then
        cp .firebaserc.template .firebaserc
        # Replace YOUR_PROJECT_ID with actual project ID from .env
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/YOUR_PROJECT_ID/$FIREBASE_PROJECT_ID/g" .firebaserc
        else
            # Linux
            sed -i "s/YOUR_PROJECT_ID/$FIREBASE_PROJECT_ID/g" .firebaserc
        fi
        echo "✅ Created and configured .firebaserc with project ID: $FIREBASE_PROJECT_ID"
    else
        echo "❌ .firebaserc.template not found"
        exit 1
    fi
fi

# Generate firebase-config.js from environment variables
cat > public/firebase-config.js << EOF
// Development Firebase Configuration
// This file is auto-generated from .env during local setup
// It will be overwritten during deployment with production values
window.FIREBASE_CONFIG = {
    apiKey: "$FIREBASE_API_KEY",
    authDomain: "$FIREBASE_AUTH_DOMAIN",
    projectId: "$FIREBASE_PROJECT_ID",
    storageBucket: "$FIREBASE_STORAGE_BUCKET",
    messagingSenderId: "$FIREBASE_MESSAGING_SENDER_ID",
    appId: "$FIREBASE_APP_ID",
    measurementId: "$FIREBASE_MEASUREMENT_ID"
};
EOF

echo "✅ Generated firebase-config.js from environment variables"

echo ""
echo "🎉 Local development setup complete!"
echo ""
echo "📂 Files configured:"
echo "   ✓ .firebaserc (project: $FIREBASE_PROJECT_ID)"
echo "   ✓ public/firebase-config.js (auto-generated)"
echo ""
echo "🚀 You can now run 'npm start' to begin development"
echo ""
echo "� For production deployment, make sure GitHub secrets are configured:"
echo "   - FIREBASE_API_KEY"
echo "   - FIREBASE_AUTH_DOMAIN"
echo "   - FIREBASE_PROJECT_ID"
echo "   - FIREBASE_STORAGE_BUCKET"
echo "   - FIREBASE_MESSAGING_SENDER_ID"
echo "   - FIREBASE_APP_ID"
echo "   - FIREBASE_MEASUREMENT_ID"
echo "   - FIREBASE_SERVICE_ACCOUNT_$FIREBASE_PROJECT_ID"
