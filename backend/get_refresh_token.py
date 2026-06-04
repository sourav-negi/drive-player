"""
One-time helper — generates a Google Drive OAuth refresh token.

Prerequisites:
    1. Go to https://console.cloud.google.com → your project
    2. APIs & Services → OAuth consent screen
       - Choose "External", fill in app name + your email, Save
    3. Credentials → + CREATE CREDENTIALS → OAuth client ID
       - Application type: "Desktop app"
       - Download the JSON (or just note client_id + client_secret)

Usage:
    python get_refresh_token.py

This opens a browser for you to approve access to your Drive,
then prints the refresh token.  Copy it into backend/.env and
you're done — the app authenticates as you from then on.
"""

import os
import sys

from dotenv import load_dotenv

load_dotenv()

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]


def main():
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()

    # read from .env, or ask interactively
    if not client_id:
        print("Paste your OAuth client ID (from Google Cloud Console → Credentials → OAuth 2.0 Client ID):")
        client_id = input("> ").strip()
    if not client_secret:
        print("Paste your OAuth client secret:")
        client_secret = input("> ").strip()

    if not client_id or not client_secret:
        print("\nERROR: both client_id and client_secret are required.", file=sys.stderr)
        print("Create an OAuth 2.0 Client ID at:", file=sys.stderr)
        print("  https://console.cloud.google.com/apis/credentials", file=sys.stderr)
        sys.exit(1)

    # build the client config that google-auth-oauthlib expects
    client_config = {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }

    from google_auth_oauthlib.flow import InstalledAppFlow

    print("\n→ Opening browser for Google sign-in…")
    print("  (if the browser doesn't open, copy the URL from the console output)\n")

    flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
    credentials = flow.run_local_server(port=0)

    print("\n" + "=" * 60)
    print(" ✅  Success!  Copy these into your backend/.env file:\n")
    print(f"GOOGLE_CLIENT_ID={credentials.client_id}")
    print(f"GOOGLE_CLIENT_SECRET={credentials.client_secret}")
    print(f"GOOGLE_REFRESH_TOKEN={credentials.refresh_token}")
    print("\n" + "=" * 60)
    print("\nAfter updating .env, restart the backend.")


if __name__ == "__main__":
    main()
