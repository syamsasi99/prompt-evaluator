# Scripts

This directory contains utility scripts for the Prompt Evaluator project.

## upload-to-gcp.py

Python script to upload DMG files to Google Cloud Storage bucket (private storage).

### Purpose
- Reads GCP credentials from environment variable (base64-encoded)
- Decodes credentials in memory (never writes to file)
- Uploads DMG and ZIP files to `gs://prompt-evaluator/releases/` **privately**
- Generates signed URLs for secure access (valid for 1 year)
- Creates both versioned and latest folders
- **Files are NOT public** - accessible only via signed URLs

### Usage

**Environment Variable Required:**
```bash
export GCP_ENCODED_API_TOKEN="<base64-encoded-service-account-json>"
```

**Command:**
```bash
python scripts/upload-to-gcp.py <version> <dmg_path> <zip_path>
```

**Example:**
```bash
python scripts/upload-to-gcp.py \
  1.0.1 \
  release/Prompt-Evaluator-1.0.1-arm64.dmg \
  release/Prompt-Evaluator-1.0.1-arm64-mac.zip
```

### Dependencies

Install required Python packages:
```bash
pip install -r scripts/requirements.txt
```

Or install individually:
```bash
pip install google-cloud-storage google-auth
```

### What it does

1. Reads `GCP_ENCODED_API_TOKEN` from environment
2. Decodes base64 to get service account JSON
3. Creates GCP credentials in-memory (no file creation)
4. Uploads files **privately** to two locations:
   - **Versioned folder:** `gs://prompt-evaluator/releases/v{version}/`
   - **Latest folder:** `gs://prompt-evaluator/releases/latest/`
5. Generates signed URLs (valid for 365 days) for secure access
6. Prints GCS URIs and signed URLs

### Output

```
🚀 Starting upload for version 1.0.1
📦 DMG: release/Prompt-Evaluator-1.0.1-arm64.dmg
📦 ZIP: release/Prompt-Evaluator-1.0.1-arm64-mac.zip

✅ GCP credentials loaded successfully from environment variable
============================================================
UPLOADING TO VERSIONED FOLDER
============================================================
📤 Uploading release/Prompt-Evaluator-1.0.1-arm64.dmg to gs://prompt-evaluator/releases/v1.0.1/Prompt-Evaluator-1.0.1-arm64.dmg
✅ Upload complete: gs://prompt-evaluator/releases/v1.0.1/Prompt-Evaluator-1.0.1-arm64.dmg

📤 Uploading release/Prompt-Evaluator-1.0.1-arm64-mac.zip to gs://prompt-evaluator/releases/v1.0.1/Prompt-Evaluator-1.0.1-arm64-mac.zip
✅ Upload complete: gs://prompt-evaluator/releases/v1.0.1/Prompt-Evaluator-1.0.1-arm64-mac.zip

============================================================
UPLOADING TO LATEST FOLDER
============================================================
📤 Uploading release/Prompt-Evaluator-1.0.1-arm64.dmg to gs://prompt-evaluator/releases/latest/Prompt-Evaluator-1.0.1-arm64.dmg
✅ Upload complete: gs://prompt-evaluator/releases/latest/Prompt-Evaluator-1.0.1-arm64.dmg

📤 Uploading release/Prompt-Evaluator-1.0.1-arm64-mac.zip to gs://prompt-evaluator/releases/latest/Prompt-Evaluator-1.0.1-arm64-mac.zip
✅ Upload complete: gs://prompt-evaluator/releases/latest/Prompt-Evaluator-1.0.1-arm64-mac.zip

============================================================
GENERATING SIGNED URLS (Valid for 1 year)
============================================================
🔐 Generating secure signed URLs...

============================================================
UPLOAD SUMMARY
============================================================
✅ All files uploaded successfully!

📋 Versioned GCS URIs:
   DMG: gs://prompt-evaluator/releases/v1.0.1/Prompt-Evaluator-1.0.1-arm64.dmg
   ZIP: gs://prompt-evaluator/releases/v1.0.1/Prompt-Evaluator-1.0.1-arm64-mac.zip

📋 Latest GCS URIs:
   DMG: gs://prompt-evaluator/releases/latest/Prompt-Evaluator-1.0.1-arm64.dmg
   ZIP: gs://prompt-evaluator/releases/latest/Prompt-Evaluator-1.0.1-arm64-mac.zip

🔐 Signed URLs (valid for 365 days):
   Versioned DMG: https://storage.googleapis.com/promptfooplusplus/releases/v1.0.1/Prompt-Evaluator-1.0.1-arm64.dmg?X-Goog-Algorith...
   Latest DMG: https://storage.googleapis.com/promptfooplusplus/releases/latest/Prompt-Evaluator-1.0.1-arm64.dmg?X-Goog-Algorithm...

🌐 Browse all releases (requires GCP auth):
   https://console.cloud.google.com/storage/browser/promptfooplusplus/releases

ℹ️  Note: Files are stored privately. Use signed URLs for access.
```

### Security Features

✅ **No file creation** - Credentials stay in memory only
✅ **Base64 decoding in-memory** - Never written to disk
✅ **Environment variable input** - No command-line exposure
✅ **Automatic cleanup** - Credentials object garbage collected after use
✅ **Private storage** - Files NOT publicly accessible
✅ **Signed URLs** - Time-limited secure access (365 days)
✅ **No public bucket** - Bucket remains private

### About Signed URLs

Signed URLs provide temporary, secure access to private GCS objects without making the bucket public.

**Features:**
- Valid for 365 days (configurable)
- No authentication required to download
- Cannot be used to list bucket contents
- Cannot be used to upload or modify files
- Expires automatically after 1 year

**Example signed URL:**
```
https://storage.googleapis.com/promptfooplusplus/releases/v1.0.1/Prompt-Evaluator-1.0.1-arm64.dmg?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=...&X-Goog-Date=20250128T000000Z&X-Goog-Expires=31536000&X-Goog-SignedHeaders=host&X-Goog-Signature=...
```

This URL can be shared publicly and will work for 1 year without requiring GCP authentication.

### Error Handling

The script will exit with an error if:
- `GCP_ENCODED_API_TOKEN` environment variable is not set
- Base64 decoding fails (invalid encoding)
- JSON parsing fails (invalid service account format)
- DMG or ZIP files don't exist
- Upload to GCS fails (permissions, network, etc.)

### Used By

- GitHub Actions workflow: `.github/workflows/build-release.yml`
- Automatically runs on every merge to `main` branch
