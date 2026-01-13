#!/bin/bash
# Generate BetterAuth secret
echo "Generating BetterAuth secret..."
SECRET=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
echo "Generated secret: $SECRET"
