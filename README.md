Drape & Aura Build v1

This package connects the live storefront to Supabase products and adds product-image upload in the admin.

Files to upload to the GitHub repo:
- index.html
- app.js
- styles.css
- admin.html
- admin.js
- admin.css
- storage_setup.sql (do NOT upload this to the website; run it once in Supabase SQL Editor after creating the storage bucket)

Before using image upload:
1. Supabase -> Storage -> New bucket
2. Name: product-images
3. Make it Public
4. Run storage_setup.sql in SQL Editor

Keep config.js private to this project and keep using only the publishable/anon key in the browser. Never use a service_role/secret key in frontend files.
