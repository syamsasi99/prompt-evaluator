#!/usr/bin/env python3
"""
Upload DMG files to GCP Storage Bucket

This script reads GCP credentials from an environment variable (base64-encoded),
decodes it in memory, and uploads DMG files to the promptfooplusplus bucket.

Usage:
    python upload-to-gcp.py <version> <dmg_path>

Environment Variables:
    GCP_ENCODED_API_TOKEN: Base64-encoded GCP service account JSON

Example:
    export GCP_ENCODED_API_TOKEN="<base64-encoded-json>"
    python upload-to-gcp.py 1.0.1 release/Promptfoo++-1.0.1-arm64.dmg
"""

import os
import sys
import base64
import json
import tempfile
from pathlib import Path
from google.cloud import storage
from google.oauth2 import service_account

# Configuration
BUCKET_NAME = "promptfooplusplus"
RELEASES_PREFIX = "releases"


def get_credentials_from_env():
    """
    Get GCP credentials from environment variable.
    Decodes base64-encoded service account JSON.

    Returns:
        service_account.Credentials: GCP service account credentials
    """
    encoded_token = os.environ.get("GCP_ENCODED_API_TOKEN")

    if not encoded_token:
        raise ValueError(
            "GCP_ENCODED_API_TOKEN environment variable not found. "
            "Please set it with base64-encoded service account JSON."
        )

    try:
        # Decode base64 to get JSON string
        decoded_json = base64.b64decode(encoded_token).decode('utf-8')

        # Parse JSON to dictionary
        service_account_info = json.loads(decoded_json)

        # Create credentials from the service account info (in-memory, no file)
        credentials = service_account.Credentials.from_service_account_info(
            service_account_info
        )

        print("✅ GCP credentials loaded successfully from environment variable")
        return credentials

    except base64.binascii.Error as e:
        raise ValueError(f"Failed to decode base64 token: {e}")
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse service account JSON: {e}")
    except Exception as e:
        raise ValueError(f"Failed to create credentials: {e}")


def upload_file_to_gcs(credentials, local_path, gcs_path):
    """
    Upload a file to Google Cloud Storage.

    Files are uploaded privately (not public).
    Access via signed URLs or authenticated requests.

    Args:
        credentials: GCP service account credentials
        local_path (str): Path to local file
        gcs_path (str): Destination path in GCS (without gs:// prefix)

    Returns:
        tuple: (blob object, gcs_uri)
    """
    try:
        # Initialize storage client
        storage_client = storage.Client(credentials=credentials)
        bucket = storage_client.bucket(BUCKET_NAME)

        # Create blob and upload
        blob = bucket.blob(gcs_path)

        print(f"📤 Uploading {local_path} to gs://{BUCKET_NAME}/{gcs_path}")

        # Upload file (private by default)
        blob.upload_from_filename(
            local_path,
            content_type=_get_content_type(local_path)
        )

        gcs_uri = f"gs://{BUCKET_NAME}/{gcs_path}"
        print(f"✅ Upload complete: {gcs_uri}")

        return blob, gcs_uri

    except Exception as e:
        print(f"❌ Upload failed: {e}", file=sys.stderr)
        raise


def generate_signed_url(blob, expiration_days=365):
    """
    Generate a signed URL for private blob access.

    Args:
        blob: GCS blob object
        expiration_days (int): Number of days until URL expires (default: 365)

    Returns:
        str: Signed URL
    """
    from datetime import timedelta

    try:
        # Generate signed URL (valid for specified days)
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(days=expiration_days),
            method="GET"
        )
        return signed_url
    except Exception as e:
        print(f"⚠️  Warning: Could not generate signed URL: {e}")
        return f"gs://{blob.bucket.name}/{blob.name}"


def _get_content_type(file_path):
    """Get content type based on file extension."""
    if file_path.endswith('.dmg'):
        return 'application/x-apple-diskimage'
    elif file_path.endswith('.zip'):
        return 'application/zip'
    else:
        return 'application/octet-stream'


def main():
    """Main function to handle DMG upload to GCP."""

    # Check arguments
    if len(sys.argv) != 3:
        print("Usage: python upload-to-gcp.py <version> <dmg_path>")
        print("Example: python upload-to-gcp.py 1.0.1 release/Promptfoo++-1.0.1-arm64.dmg")
        sys.exit(1)

    version = sys.argv[1]
    dmg_path = sys.argv[2]

    # Validate file exists
    if not Path(dmg_path).exists():
        print(f"❌ Error: DMG file not found: {dmg_path}", file=sys.stderr)
        sys.exit(1)

    print(f"🚀 Starting upload for version {version}")
    print(f"📦 DMG: {dmg_path}")
    print()

    try:
        # Get credentials from environment variable
        credentials = get_credentials_from_env()

        # Define GCS paths
        dmg_filename = Path(dmg_path).name

        # Upload to versioned folder
        versioned_dmg_path = f"{RELEASES_PREFIX}/v{version}/{dmg_filename}"

        # Upload to latest folder
        latest_dmg_path = f"{RELEASES_PREFIX}/latest/{dmg_filename}"

        print("=" * 60)
        print("UPLOADING TO VERSIONED FOLDER")
        print("=" * 60)

        # Upload DMG to versioned folder
        dmg_blob, dmg_uri = upload_file_to_gcs(credentials, dmg_path, versioned_dmg_path)
        print()

        print("=" * 60)
        print("UPLOADING TO LATEST FOLDER")
        print("=" * 60)

        # Upload DMG to latest folder
        latest_dmg_blob, latest_dmg_uri = upload_file_to_gcs(credentials, dmg_path, latest_dmg_path)
        print()

        print("=" * 60)
        print("GENERATING SIGNED URLS (Valid for 1 year)")
        print("=" * 60)
        print("🔐 Generating secure signed URLs...")
        print()

        # Generate signed URLs (valid for 365 days)
        dmg_url = generate_signed_url(dmg_blob, expiration_days=365)
        latest_dmg_url = generate_signed_url(latest_dmg_blob, expiration_days=365)

        print("=" * 60)
        print("UPLOAD SUMMARY")
        print("=" * 60)
        print(f"✅ DMG file uploaded successfully!")
        print()
        print("📋 Versioned GCS URI:")
        print(f"   {dmg_uri}")
        print()
        print("📋 Latest GCS URI:")
        print(f"   {latest_dmg_uri}")
        print()
        print("🔐 Signed URLs (valid for 365 days):")
        print(f"   Versioned: {dmg_url[:100]}...")
        print(f"   Latest:    {latest_dmg_url[:100]}...")
        print()
        print(f"🌐 Browse all releases (requires GCP auth):")
        print(f"   https://console.cloud.google.com/storage/browser/{BUCKET_NAME}/{RELEASES_PREFIX}")
        print()
        print("ℹ️  Note: Files are stored privately. Use signed URLs for access.")
        print()

        # Export URLs for GitHub Actions (optional)
        if os.environ.get("GITHUB_OUTPUT"):
            with open(os.environ["GITHUB_OUTPUT"], "a") as f:
                f.write(f"dmg_url={dmg_url}\n")
                f.write(f"latest_dmg_url={latest_dmg_url}\n")
                f.write(f"dmg_uri={dmg_uri}\n")
                f.write(f"latest_dmg_uri={latest_dmg_uri}\n")
            print("📝 URLs and URIs exported to GITHUB_OUTPUT")

        return 0

    except Exception as e:
        print(f"\n❌ Upload failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
