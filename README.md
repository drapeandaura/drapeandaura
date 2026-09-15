# Drape & Aura — Customer Account v2

This update fixes the customer account popup close behavior after sign-in.

## Replace these files in GitHub
- index.html
- styles.css
- app.js

## Do NOT replace
- config.js — keep your existing Drape & Aura Supabase + WhatsApp configuration.

## Fixes
- Account popup close (X) now has a direct, protected click handler.
- Escape key closes open popups.
- Close button is kept above the account image/content layer.
- Existing customer sign-in, sign-up, password reset and order-history functionality is retained.
