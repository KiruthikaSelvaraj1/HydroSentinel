"""
============================================================================
FIREBASE ADMIN USER SETUP SCRIPT
============================================================================
This script:
1. Creates a Firebase user with email/password (or uses existing)
2. Sets the user as admin in Firestore (artifacts/<APP_ID>/public/data/roles/admin_list)
3. Outputs the user's UID for reference

Prerequisites:
- Service account JSON file downloaded from Firebase Console
- FIREBASE_SERVICE_ACCOUNT_PATH environment variable set
- APP_ID environment variable set

Usage:
    python setup_admin_user.py --email admin@example.com --password YourPassword123

============================================================================
"""

import os
import sys
import argparse
import json

# Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, auth, firestore

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    service_account_path = os.environ.get('FIREBASE_SERVICE_ACCOUNT_PATH')
    
    if not service_account_path:
        print("❌ ERROR: FIREBASE_SERVICE_ACCOUNT_PATH environment variable not set!")
        print("\nSet it in PowerShell:")
        print('$env:FIREBASE_SERVICE_ACCOUNT_PATH="E:\\Flood-Management-System-for-Chennai\\backend\\serviceAccountKey.json"')
        sys.exit(1)
    
    if not os.path.exists(service_account_path):
        print(f"❌ ERROR: Service account file not found at: {service_account_path}")
        print("\nDownload it from Firebase Console:")
        print("1. Go to Project Settings → Service accounts")
        print("2. Click 'Generate new private key'")
        print("3. Save to backend/serviceAccountKey.json")
        sys.exit(1)
    
    try:
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        print("✅ Firebase Admin SDK initialized")
        return firestore.client()
    except Exception as e:
        print(f"❌ Error initializing Firebase: {e}")
        sys.exit(1)

def create_or_get_user(email, password):
    """Create a new Firebase user or get existing one"""
    try:
        # Try to create new user
        user = auth.create_user(
            email=email,
            password=password,
            email_verified=False
        )
        print(f"✅ Created new user: {email}")
        print(f"   UID: {user.uid}")
        return user.uid
    except auth.EmailAlreadyExistsError:
        # User exists, get their info
        user = auth.get_user_by_email(email)
        print(f"⚠️  User already exists: {email}")
        print(f"   UID: {user.uid}")
        
        # Update password
        try:
            auth.update_user(user.uid, password=password)
            print(f"✅ Updated password for existing user")
        except Exception as e:
            print(f"⚠️  Could not update password: {e}")
        
        return user.uid
    except Exception as e:
        print(f"❌ Error creating/getting user: {e}")
        sys.exit(1)

def set_admin_role(db, uid, app_id):
    """Set user as admin in Firestore"""
    try:
        # Path: artifacts/<APP_ID>/public/data/roles/admin_list
        doc_path = f'artifacts/{app_id}/public/data/roles/admin_list'
        
        print(f"\n📝 Setting admin role in Firestore...")
        print(f"   Path: {doc_path}")
        
        # Get or create document
        doc_ref = db.document(doc_path)
        doc = doc_ref.get()
        
        if doc.exists:
            # Document exists, update adminUids array
            admin_uids = doc.to_dict().get('adminUids', [])
            if uid not in admin_uids:
                admin_uids.append(uid)
                doc_ref.update({'adminUids': admin_uids})
                print(f"✅ Added UID to existing admin list")
            else:
                print(f"✅ UID already in admin list")
        else:
            # Create new document
            doc_ref.set({
                'adminUids': [uid],
                'created_at': firestore.SERVER_TIMESTAMP,
                'description': 'List of admin user UIDs'
            })
            print(f"✅ Created admin list document")
        
        print(f"✅ User is now an admin!")
        return True
    except Exception as e:
        print(f"❌ Error setting admin role: {e}")
        return False

def verify_admin_access(db, uid, app_id):
    """Verify user has admin access"""
    try:
        doc_path = f'artifacts/{app_id}/public/data/roles/admin_list'
        doc_ref = db.document(doc_path)
        doc = doc_ref.get()
        
        if doc.exists:
            admin_uids = doc.to_dict().get('adminUids', [])
            if uid in admin_uids:
                print(f"\n✅ VERIFICATION PASSED: User is in admin list")
                return True
            else:
                print(f"\n❌ VERIFICATION FAILED: User NOT in admin list")
                return False
        else:
            print(f"\n❌ VERIFICATION FAILED: Admin list document not found")
            return False
    except Exception as e:
        print(f"❌ Error verifying admin access: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Setup Firebase admin user')
    parser.add_argument('--email', required=True, help='Admin email address')
    parser.add_argument('--password', required=True, help='Admin password (min 6 chars)')
    args = parser.parse_args()
    
    print("=" * 80)
    print("🔧 FIREBASE ADMIN USER SETUP")
    print("=" * 80)
    
    # Validate password
    if len(args.password) < 6:
        print("❌ ERROR: Password must be at least 6 characters")
        sys.exit(1)
    
    # Get APP_ID from environment
    app_id = os.environ.get('APP_ID')
    if not app_id:
        print("❌ ERROR: APP_ID environment variable not set!")
        print("\nSet it in PowerShell (use your Firebase project ID):")
        print('$env:APP_ID="flood-management-chennai"')
        sys.exit(1)
    
    print(f"\n📋 Configuration:")
    print(f"   Email: {args.email}")
    print(f"   APP_ID: {app_id}")
    
    # Initialize Firebase
    db = initialize_firebase()
    
    # Create/get user
    uid = create_or_get_user(args.email, args.password)
    
    # Set admin role
    set_admin_role(db, uid, app_id)
    
    # Verify admin access
    verify_admin_access(db, uid, app_id)
    
    # Summary
    print("\n" + "=" * 80)
    print("✅ SETUP COMPLETE!")
    print("=" * 80)
    print(f"\n📝 Admin User Details:")
    print(f"   Email: {args.email}")
    print(f"   UID: {uid}")
    print(f"   Firestore Path: artifacts/{app_id}/public/data/roles/admin_list")
    print(f"\n🚀 Next Steps:")
    print(f"   1. Start backend: python backend/api.py")
    print(f"   2. Start frontend: npm run dev")
    print(f"   3. Login with: {args.email}")
    print(f"   4. You should see admin-only tabs in sidebar")
    print("=" * 80)

if __name__ == '__main__':
    main()
