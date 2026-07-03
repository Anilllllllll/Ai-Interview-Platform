#!/bin/bash
# ============================================
# SSL Certificate Setup Script
# Gets a FREE SSL certificate from Let's Encrypt
# ============================================
# USAGE:
#   chmod +x scripts/init-ssl.sh
#   ./scripts/init-ssl.sh yourdomain.com your@email.com
#
# PREREQUISITES:
#   1. Domain pointing to this server's IP (A record)
#   2. Port 80 open (for Let's Encrypt verification)
#   3. Docker running

set -e

# ─────────────────────────────────────────
# VALIDATE INPUTS
# ─────────────────────────────────────────
DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: ./scripts/init-ssl.sh <domain> <email>"
    echo "Example: ./scripts/init-ssl.sh nexa-interview.xyz anil@example.com"
    exit 1
fi

echo "=========================================="
echo "  SSL Certificate Setup"
echo "  Domain: $DOMAIN"
echo "  Email:  $EMAIL"
echo "=========================================="

# ─────────────────────────────────────────
# STEP 1: Create directories for certificates
# ─────────────────────────────────────────
# Certbot stores certificates in /etc/letsencrypt
# We'll mount this directory into both the Certbot
# and Nginx containers via Docker volumes
echo "[1/4] Creating certificate directories..."
mkdir -p certbot/conf certbot/www

# ─────────────────────────────────────────
# STEP 2: Stop Nginx (free port 80)
# ─────────────────────────────────────────
# Certbot needs port 80 to verify you own the domain
# It places a temporary file on your server, then
# Let's Encrypt checks if it can access that file
# via http://yourdomain.com/.well-known/acme-challenge/xxx
echo "[2/4] Stopping current containers..."
docker compose down 2>/dev/null || true

# ─────────────────────────────────────────
# STEP 3: Get the certificate
# ─────────────────────────────────────────
# We use Certbot in standalone mode:
# - It starts its own temporary web server on port 80
# - Let's Encrypt sends a challenge to verify domain ownership
# - Certbot receives the certificate and saves it
#
# Flags explained:
#   certonly        = only get cert, don't install it (we handle Nginx ourselves)
#   --standalone    = Certbot runs its own web server for verification
#   --agree-tos     = Agree to Let's Encrypt Terms of Service
#   --no-eff-email  = Don't share email with EFF
#   -d $DOMAIN      = The domain to get a cert for
#   -m $EMAIL       = Email for expiry notifications
echo "[3/4] Getting SSL certificate from Let's Encrypt..."
docker run --rm \
    -p 80:80 \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    certbot/certbot certonly \
    --standalone \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -m "$EMAIL"

# ─────────────────────────────────────────
# STEP 4: Verify certificate exists
# ─────────────────────────────────────────
if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo ""
    echo "=========================================="
    echo "  ✅ SSL Certificate obtained!"
    echo "=========================================="
    echo ""
    echo "Certificate files:"
    echo "  Full chain: certbot/conf/live/$DOMAIN/fullchain.pem"
    echo "  Private key: certbot/conf/live/$DOMAIN/privkey.pem"
    echo ""
    echo "Next steps:"
    echo "  1. Update nginx/default.conf with your domain: $DOMAIN"
    echo "  2. Update docker-compose.yml to use the SSL config"
    echo "  3. Run: docker compose up -d"
    echo ""
    echo "Certificate auto-renews via the certbot container in docker-compose.yml"
else
    echo "❌ Certificate not found. Check errors above."
    exit 1
fi
