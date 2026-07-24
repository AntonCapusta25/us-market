import json
import os
from google_auth_oauthlib.flow import InstalledAppFlow

# Instructions:
# 1. Install dependency: pip install google-auth-oauthlib
# 2. Download your OAuth 2.0 Client ID JSON from Google Cloud Console
# 3. Rename it to 'client_secret.json' and place it in this folder
# 4. Run this script: python get_google_token.py

SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar'
]

def main():
    flow = InstalledAppFlow.from_client_secrets_file('client_secret.json', SCOPES)
    creds = flow.run_local_server(port=0)
    
    print("\n--- GOOGLE CREDENTIALS ---")
    print(f"GOOGLE_CLIENT_ID: {creds.client_id}")
    print(f"GOOGLE_CLIENT_SECRET: {creds.client_secret}")
    print(f"GOOGLE_REFRESH_TOKEN: {creds.refresh_token}")
    print("--------------------------\n")
    
    print("Copy these values into your .env file and Supabase secrets.")

if __name__ == '__main__':
    main()
