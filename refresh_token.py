import urllib.parse
import urllib.request
import json
import webbrowser

# Read credentials dynamically from .env
env = {}
try:
    with open(".env", "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
except Exception:
    pass

CLIENT_ID     = env.get("GOOGLE_CLIENT_ID", "")
CLIENT_SECRET = env.get("GOOGLE_CLIENT_SECRET", "")
REDIRECT_URI  = "http://localhost:8080/"

# 1. Print instructions
print("=" * 80)
print("GOOGLE OAUTH REFRESH TOKEN GENERATOR")
print("=" * 80)
print("BEFORE RUNNING:")
print(f"1. Make sure you have added '{REDIRECT_URI}' to 'Authorized redirect URIs'")
print("   in your Google Cloud Console for this client ID:")
print(f"   {CLIENT_ID}")
print("2. If you haven't, go to https://console.cloud.google.com/apis/credentials,")
print("   edit your client, add the URI, and click Save.")
print("=" * 80)

# 2. Build auth URL
params = {
    "client_id": CLIENT_ID,
    "redirect_uri": REDIRECT_URI,
    "response_type": "code",
    "scope": "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar",
    "access_type": "offline",
    "prompt": "consent"
}
auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)

print("\nOpening browser for authorization...")
webbrowser.open(auth_url)

print("\nIf the browser didn't open, copy and paste this URL into your browser:")
print(auth_url)
print("\n" + "-" * 80)
print("After authorizing, you will be redirected to a page that might fail to load.")
print("This is EXPECTED! Just copy the FULL URL from the browser's address bar.")
print("It should look like: http://localhost:8080/?code=4/0Af...&scope=...")
print("-" * 80)

redirected_url = input("\nPaste the redirect URL (or code) here: ").strip()

# Extract code from URL if full URL is pasted
code = redirected_url
if "code=" in redirected_url:
    parsed = urllib.parse.urlparse(redirected_url)
    queries = urllib.parse.parse_qs(parsed.query)
    if "code" in queries:
        code = queries["code"][0]

print(f"\nExchanging code: {code[:15]}... for token...")

# 3. Exchange code
token_url = "https://oauth2.googleapis.com/token"
data = urllib.parse.urlencode({
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "code": code,
    "redirect_uri": REDIRECT_URI,
    "grant_type": "authorization_code"
}).encode("utf-8")

req = urllib.request.Request(token_url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})

try:
    with urllib.request.urlopen(req) as response:
        res_data = json.loads(response.read().decode("utf-8"))
        refresh_token = res_data.get("refresh_token")
        
        print("\n" + "=" * 60)
        print("SUCCESS! NEW REFRESH TOKEN GENERATED:")
        print("=" * 60)
        print(f"\nGOOGLE_REFRESH_TOKEN={refresh_token}\n")
        print("=" * 60)
        print("\nNow update in TWO places:")
        print("1. Your .env file (GOOGLE_REFRESH_TOKEN=...)")
        print("2. Supabase Dashboard -> Edge Functions -> send-email -> Secrets")
        print("   OR run: supabase secrets set GOOGLE_REFRESH_TOKEN=<token>")
        print("=" * 60)
except Exception as e:
    print(f"\nError exchanging code: {e}")
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
