import os
import time
import requests
from supabase import create_client, Client

# Config
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434/api/generate")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def score_lead(lead_message):
    """
    Use Local LLM to score lead intent (0-100)
    """
    prompt = f"Analyze this business inquiry: '{lead_message}'. Score its quality from 0-100. Return ONLY the number."
    
    try:
        response = requests.post(OLLAMA_URL, json={
            "model": "llama3",
            "prompt": prompt,
            "stream": False
        })
        score_text = response.json().get("response", "0").strip()
        # Extract only digits in case LLM added extra text
        score = "".join(filter(str.isdigit, score_text))
        return int(score) if score else 0
    except Exception as e:
        print(f"Error calling LLM: {e}")
        return 0

def process_new_leads():
    """
    Fetch 'New' leads, score them, and update status
    """
    print("Checking for new leads in Supabase...")
    
    # 1. Fetch leads with status 'New'
    response = supabase.table("booking_leads").select("*").eq("status", "New").execute()
    leads = response.data

    for lead in leads:
        print(f"Processing lead: {lead['name']}...")
        
        # 2. Score the lead
        score = score_lead(lead.get('message', ''))
        print(f"Lead Score: {score}")

        # 3. Update Supabase with the score and log the activity
        # We can store the score in 'notes' or a new 'ai_score' column if you add it
        new_status = "In Progress" if score > 70 else "New"
        
        supabase.table("booking_leads").update({
            "status": new_status,
            "notes": f"AI Intent Score: {score}/100. {lead.get('notes', '')}"
        }).eq("id", lead["id"]).execute()

        print(f"Updated lead {lead['name']} to {new_status}")

if __name__ == "__main__":
    print("🚀 Automation Agent (Supabase Linked) Started...")
    while True:
        try:
            process_new_leads()
        except Exception as e:
            print(f"Main Loop Error: {e}")
            
        time.sleep(30) # Check every 30 seconds

