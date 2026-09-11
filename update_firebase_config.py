"""
Firebase Configuration Helper Script
=====================================
This script helps you update your Firebase configuration across all files.

Usage:
    python update_firebase_config.py

The script will:
1. Prompt you for your Firebase configuration
2. Update src/App.jsx with web config
3. Update backend/app.py with project ID
4. Verify firebase-admin-credentials.json exists
5. Create/update .gitignore
"""

import os
import json
import re

def print_header(text):
    """Print a formatted header"""
    print("\n" + "="*70)
    print(f"  {text}")
    print("="*70 + "\n")

def print_step(step_num, text):
    """Print a step number"""
    print(f"\n🔹 Step {step_num}: {text}")

def get_user_input(prompt, default=None):
    """Get user input with optional default"""
    if default:
        user_input = input(f"{prompt} [{default}]: ").strip()
        return user_input if user_input else default
    return input(f"{prompt}: ").strip()

def update_app_jsx(config):
    """Update src/App.jsx with Firebase config"""
    file_path = os.path.join('src', 'App.jsx')
    
    if not os.path.exists(file_path):
        print(f"❌ Error: {file_path} not found!")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Update firebaseConfig
    firebase_config_pattern = r'const firebaseConfig = \{[^}]+\};'
    new_firebase_config = f'''const firebaseConfig = {{
  apiKey: "{config['apiKey']}",
  authDomain: "{config['authDomain']}",
  projectId: "{config['projectId']}",
  storageBucket: "{config['storageBucket']}",
  messagingSenderId: "{config['messagingSenderId']}",
  appId: "{config['appId']}",
  measurementId: "{config.get('measurementId', '')}"
}};'''
    
    content = re.sub(firebase_config_pattern, new_firebase_config, content, flags=re.DOTALL)
    
    # Update appId
    app_id_pattern = r"const appId = typeof __app_id !== 'undefined' \? __app_id : '[^']+'"
    new_app_id = f"const appId = typeof __app_id !== 'undefined' ? __app_id : '{config['projectId']}'"
    content = re.sub(app_id_pattern, new_app_id, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Updated {file_path}")
    return True

def update_app_py(project_id):
    """Update backend/app.py with project ID"""
    file_path = os.path.join('backend', 'app.py')
    
    if not os.path.exists(file_path):
        print(f"❌ Error: {file_path} not found!")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Update APP_ID
    app_id_pattern = r"APP_ID = os\.environ\.get\('APP_ID', '[^']+'\)"
    new_app_id = f"APP_ID = os.environ.get('APP_ID', '{project_id}')"
    content = re.sub(app_id_pattern, new_app_id, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Updated {file_path}")
    return True

def check_credentials_file():
    """Check if firebase-admin-credentials.json exists"""
    file_path = 'firebase-admin-credentials.json'
    
    if os.path.exists(file_path):
        print(f"✅ Found {file_path}")
        return True
    else:
        print(f"⚠️  Warning: {file_path} not found!")
        print("   Please download your Firebase Admin SDK JSON file and")
        print("   rename it to 'firebase-admin-credentials.json' in the project root.")
        return False

def update_gitignore():
    """Create or update .gitignore"""
    gitignore_path = '.gitignore'
    
    entries_to_add = [
        'firebase-admin-credentials.json',
        '*.json',
        'node_modules/',
        '__pycache__/',
        '*.pyc',
        '.env',
        '.venv/',
        'venv/',
    ]
    
    existing_entries = []
    if os.path.exists(gitignore_path):
        with open(gitignore_path, 'r') as f:
            existing_entries = [line.strip() for line in f.readlines()]
    
    with open(gitignore_path, 'a') as f:
        if not existing_entries:
            f.write("# Firebase credentials\n")
        
        for entry in entries_to_add:
            if entry not in existing_entries:
                f.write(f"{entry}\n")
    
    print(f"✅ Updated {gitignore_path}")
    return True

def main():
    print_header("Firebase Configuration Helper")
    
    print("This script will help you update your Firebase configuration.")
    print("You'll need:")
    print("  1. Firebase web app config (from Firebase Console)")
    print("  2. Firebase Admin SDK JSON file (service account key)")
    print()
    
    choice = input("Do you want to continue? (y/n): ").strip().lower()
    if choice != 'y':
        print("Cancelled.")
        return
    
    # Get Firebase config from user
    print_step(1, "Enter Firebase Web App Configuration")
    print("(You can find this in Firebase Console → Project Settings → Your apps)")
    print()
    
    config = {}
    config['apiKey'] = get_user_input("API Key")
    config['authDomain'] = get_user_input("Auth Domain (e.g., your-project.firebaseapp.com)")
    config['projectId'] = get_user_input("Project ID")
    config['storageBucket'] = get_user_input("Storage Bucket (e.g., your-project.firebasestorage.app)")
    config['messagingSenderId'] = get_user_input("Messaging Sender ID")
    config['appId'] = get_user_input("App ID")
    config['measurementId'] = get_user_input("Measurement ID (optional, press Enter to skip)", "")
    
    # Confirm
    print("\n" + "-"*70)
    print("Your Configuration:")
    print("-"*70)
    for key, value in config.items():
        print(f"  {key}: {value}")
    print("-"*70)
    
    confirm = input("\nIs this correct? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Cancelled.")
        return
    
    # Update files
    print_step(2, "Updating Files")
    
    success = True
    success = success and update_app_jsx(config)
    success = success and update_app_py(config['projectId'])
    
    print_step(3, "Checking Credentials File")
    check_credentials_file()
    
    print_step(4, "Updating .gitignore")
    update_gitignore()
    
    # Final instructions
    print_header("✅ Configuration Updated!")
    
    print("Next steps:")
    print()
    print("1. Download Firebase Admin SDK JSON from Firebase Console:")
    print("   → Go to Project Settings → Service Accounts")
    print("   → Click 'Generate new private key'")
    print("   → Rename the downloaded file to: firebase-admin-credentials.json")
    print("   → Move it to your project root folder")
    print()
    print("2. Setup Firestore collections:")
    print("   → Follow FIREBASE_SETUP_GUIDE.md Step 3.3")
    print("   → Create: artifacts/YOUR_PROJECT_ID/public/data/roles/admin_list")
    print()
    print("3. Restart your servers:")
    print("   Terminal 1: cd backend && python app.py")
    print("   Terminal 2: npm run dev")
    print()
    print("4. Create admin user:")
    print("   → Register at http://localhost:5173")
    print("   → Get your UID from browser console")
    print("   → Add UID to Firestore admin_list")
    print()
    print("For detailed instructions, see FIREBASE_SETUP_GUIDE.md")
    print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nCancelled by user.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
