import os
import json
import functools
from datetime import datetime

# Flask imports
from flask import Flask, request, jsonify, g
from flask_cors import CORS

# Firebase Admin SDK imports
import firebase_admin
from firebase_admin import credentials, auth, firestore
# Removed: from firebase_admin._auth_utils import InvalidCustomToken 
# This class is internal and caused an ImportError. We will use a broader Exception handling instead.

# --- Configuration and Initialization ---

# Check for environment variables
service_account_path = os.environ.get('FIREBASE_SERVICE_ACCOUNT_PATH')
service_account_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')

# Use APP_ID for structured Firestore paths (essential for multi-user environments)
APP_ID = os.environ.get('APP_ID', 'default-app-id')

def sanitize_json_string(json_string):
    """
    Cleans up the JSON string from common shell artifacts (quotes, newlines) 
    to ensure json.loads() succeeds.
    """
    # 1. Remove outer quotes (common when setting env vars in shell)
    json_string = json_string.strip()
    if json_string.startswith("'") and json_string.endswith("'"):
        json_string = json_string[1:-1]
    if json_string.startswith('"') and json_string.endswith('"'):
        json_string = json_string[1:-1]
        
    # 2. Strip any remaining whitespace or control characters
    json_string = json_string.strip()
    
    # 3. Handle escaped newlines that some terminals might introduce
    json_string = json_string.replace('\\n', '\n')
    
    return json_string

try:
    cred = None
    
    if service_account_path:
        # Primary Method: Load from file path (most reliable for PEM issues)
        print(f"Attempting to load credentials from file path: {service_account_path}")
        cred = credentials.Certificate(service_account_path)
    elif service_account_json:
        # Fallback Method: Load from JSON string (using existing sanitizer)
        print("Attempting to load credentials from environment variable JSON string...")
        sanitized_json = sanitize_json_string(service_account_json)
        creds_dict = json.loads(sanitized_json)
        cred = credentials.Certificate(creds_dict)
    else:
        print("FATAL ERROR: Neither FIREBASE_SERVICE_ACCOUNT_PATH nor FIREBASE_SERVICE_ACCOUNT_KEY environment variable is set.")
        exit(1)
        
    firebase_admin.initialize_app(cred)
    print("Firebase Admin SDK initialized successfully.")
    
except json.JSONDecodeError:
    print("FATAL ERROR: FIREBASE_SERVICE_ACCOUNT_KEY is not a valid JSON string even after sanitization.")
    exit(1)
except Exception as e:
    # Catching specific Firebase credential errors or general exceptions
    print(f"FATAL ERROR during Firebase initialization: {e}")
    print("\nTroubleshooting Tip: Please use FIREBASE_SERVICE_ACCOUNT_PATH set to the path of your JSON key file, or ensure FIREBASE_SERVICE_ACCOUNT_KEY contains the ENTIRE JSON content without corruption.")
    exit(1)

# Firestore and Auth references
db = firestore.client()

# Collection paths
USER_COLLECTION = 'users' # Storing user role/profile globally for ease of access by server
LOGIN_LOG_PATH = f'artifacts/{APP_ID}/public/data/login_activity_logs'
PREDICTION_LOG_PATH = f'artifacts/{APP_ID}/public/data/prediction_logs'

# --- Flask App Setup ---
app = Flask(__name__)
# Enable CORS for all origins, allowing frontend communication
CORS(app) 

# --- Logging Helper Functions ---

def log_activity(user_id, action, status="success"):
    """Saves a user activity log to Firestore."""
    try:
        db.collection(LOGIN_LOG_PATH).add({
            'user_id': user_id,
            'action': action,
            'timestamp': datetime.utcnow(),
            'status': status
        })
    except Exception as e:
        print(f"Error logging activity for {user_id}: {e}")
        # Continue execution even if logging fails

def log_prediction(user_id, prediction_type, result):
    """Saves a prediction log to Firestore."""
    try:
        db.collection(PREDICTION_LOG_PATH).add({
            'user_id': user_id,
            'prediction_type': prediction_type,
            'result': result,
            'timestamp': datetime.utcnow()
        })
    except Exception as e:
        print(f"Error logging prediction for {user_id}: {e}")

# --- Authentication Decorator ---

def requires_auth(admin_required=False):
    """
    Decorator to verify Firebase ID Token from Authorization header.
    Attaches user_id and role to Flask's global 'g' object.
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({"error": "Unauthorized", "message": "Bearer token required"}), 401

            id_token = auth_header.split(' ')[1]

            try:
                # Verify the ID token
                decoded_token = auth.verify_id_token(id_token)
                uid = decoded_token['uid']
                
                # Fetch user profile from Firestore to check role
                user_doc_ref = db.collection(USER_COLLECTION).document(uid)
                user_doc = user_doc_ref.get()
                
                if not user_doc.exists:
                    return jsonify({"error": "Unauthorized", "message": "User profile missing"}), 401
                
                user_data = user_doc.to_dict()
                role = user_data.get('role', 'user') # Default to 'user' if role is missing
                
                # Check for admin privilege if required
                if admin_required and role != 'admin':
                    return jsonify({"error": "Forbidden", "message": "Admin access required"}), 403

                # Attach user data to the global context
                g.user_id = uid
                g.role = role
                g.user_name = user_data.get('name')
                
                return f(*args, **kwargs)

            except auth.RevokedIdTokenError:
                return jsonify({"error": "Unauthorized", "message": "Token revoked"}), 401
            except auth.InvalidIdTokenError as e:
                return jsonify({"error": "Unauthorized", "message": f"Invalid token: {e}"}), 401
            except Exception as e:
                print(f"Authentication error: {e}")
                return jsonify({"error": "Unauthorized", "message": "Failed to authenticate token"}), 401
        return decorated_function
    return decorator

# --- API Routes ---

@app.route('/api/register', methods=['POST'])
def register():
    """Register a new user with default 'user' role."""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')

    if not all([email, password, name]):
        return jsonify({"error": "Missing required fields (email, password, name)"}), 400

    try:
        # 1. Create user in Firebase Authentication
        user = auth.create_user(
            email=email,
            password=password,
            display_name=name,
            email_verified=False
        )
        
        # 2. Store profile info in Firestore with default role
        db.collection(USER_COLLECTION).document(user.uid).set({
            'name': name,
            'email': email,
            'role': 'user',  # Default role is 'user'
            'registered_at': datetime.utcnow()
        })
        
        log_activity(user.uid, "user_register")
        return jsonify({
            "message": "User registered successfully.", 
            "uid": user.uid
        }), 201

    except auth.EmailAlreadyExistsError:
        return jsonify({"error": "Email already exists"}), 409
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({"error": f"Registration failed: {e}"}), 500


@app.route('/api/login', methods=['POST'])
def login():
    """
    Login endpoint. Returns a Firebase Custom Token.
    The client must use this Custom Token to sign in and get an ID Token.
    """
    data = request.get_json()
    email = data.get('email')
    
    # We cannot verify password server-side, so we rely on the client to use the 
    # client SDK for the initial sign-in. This route will generate a Custom Token 
    # which is mainly useful for setting up an admin or privileged user if needed.
    # For a standard login, we'll check if the user exists and return a Custom Token.

    if not email:
        return jsonify({"error": "Email is required"}), 400

    try:
        # Find the user by email
        user = auth.get_user_by_email(email)
        uid = user.uid

        # Get user role from Firestore
        user_doc = db.collection(USER_COLLECTION).document(uid).get()
        if not user_doc.exists:
             return jsonify({"error": "User profile missing in Firestore"}), 404
        
        user_data = user_doc.to_dict()
        role = user_data.get('role', 'user')
        
        # 1. Create a Firebase Custom Token
        # NOTE: A client will use this custom token to exchange for an ID token.
        custom_token = auth.create_custom_token(uid, {'role': role}).decode('utf-8')

        log_activity(uid, "user_login")
        return jsonify({
            "message": "Custom token generated successfully. Use this to sign in on client.",
            "custom_token": custom_token,
            "uid": uid,
            "role": role
        }), 200

    except auth.UserNotFoundError:
        return jsonify({"error": "Invalid credentials or user not found"}), 401
    except Exception as e:
        # Catching the generic exception now covers the InvalidCustomToken error,
        # which is often raised as a general exception if it's not imported.
        print(f"Login error: {e}")
        return jsonify({"error": "An unexpected error occurred during login"}), 500

@app.route('/api/admin/register', methods=['POST'])
def admin_register():
    """Admin register endpoint. Creates a new admin user."""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')

    if not all([email, password, name]):
        return jsonify({"error": "Missing required fields (email, password, name)"}), 400

    try:
        # 1. Create user in Firebase Authentication
        user = auth.create_user(
            email=email,
            password=password,
            display_name=name,
            email_verified=False
        )

        # 2. Store profile info in Firestore with admin role
        db.collection(USER_COLLECTION).document(user.uid).set({
            'name': name,
            'email': email,
            'role': 'admin',  # Admin role
            'registered_at': datetime.utcnow()
        })

        log_activity(user.uid, "admin_register")
        return jsonify({
            "message": "Admin user registered successfully.",
            "uid": user.uid
        }), 201

    except auth.EmailAlreadyExistsError:
        return jsonify({"error": "Email already exists"}), 409
    except Exception as e:
        print(f"Admin registration error: {e}")
        return jsonify({"error": f"Admin registration failed: {e}"}), 500


@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    """
    Admin login endpoint. Returns a Firebase Custom Token only if the user's
    Firestore profile role is 'admin'.
    """
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({"error": "Email is required"}), 400

    try:
        # Find the user by email
        user = auth.get_user_by_email(email)
        uid = user.uid

        # Check user role in Firestore
        user_doc = db.collection(USER_COLLECTION).document(uid).get()
        if not user_doc.exists:
             return jsonify({"error": "Admin profile missing"}), 404

        role = user_doc.to_dict().get('role')

        if role != 'admin':
            log_activity(uid, "admin_login_attempt", status="failed_role")
            return jsonify({"error": "Access denied. User is not an admin."}), 403

        # 1. Create a Firebase Custom Token for the admin
        custom_token = auth.create_custom_token(uid, {'role': role}).decode('utf-8')

        log_activity(uid, "admin_login")
        return jsonify({
            "message": "Admin Custom token generated successfully.",
            "custom_token": custom_token,
            "uid": uid,
            "role": role
        }), 200

    except auth.UserNotFoundError:
        return jsonify({"error": "Invalid credentials or admin user not found"}), 401
    except Exception as e:
        print(f"Admin login error: {e}")
        return jsonify({"error": "An unexpected error occurred during admin login"}), 500


@app.route('/api/anonymous_login', methods=['POST'])
def anonymous_login():
    """
    Anonymous login endpoint. Returns a Firebase Custom Token for anonymous user.
    """
    try:
        # Create a custom token for anonymous user
        custom_token = auth.create_custom_token('anonymous-user', {'role': 'user'}).decode('utf-8')

        return jsonify({
            "message": "Anonymous Custom token generated successfully.",
            "custom_token": custom_token,
            "uid": 'anonymous-user',
            "role": 'user'
        }), 200

    except Exception as e:
        print(f"Anonymous login error: {e}")
        return jsonify({"error": f"Anonymous login failed: {e}"}), 500


@app.route('/api/log', methods=['POST'])
@requires_auth()
def log_user_activity():
    """Save user activity (action, timestamp) to Firestore logs."""
    data = request.get_json()
    action = data.get('action')
    
    if not action:
        return jsonify({"error": "Missing required field (action)"}), 400

    # g.user_id is available from the decorator
    log_activity(g.user_id, action)
    
    return jsonify({
        "message": "Activity logged successfully.",
        "user_id": g.user_id,
        "action": action
    }), 200

@app.route('/api/predict_log', methods=['POST'])
@requires_auth()
def log_prediction_result():
    """Save prediction log (prediction_type, result) to Firestore."""
    data = request.get_json()
    prediction_type = data.get('prediction_type')
    result = data.get('result')
    
    if not all([prediction_type, result]):
        return jsonify({"error": "Missing required fields (prediction_type, result)"}), 400

    # g.user_id is available from the decorator
    log_prediction(g.user_id, prediction_type, result)
    
    return jsonify({
        "message": "Prediction logged successfully.",
        "user_id": g.user_id,
        "prediction_type": prediction_type
    }), 200


@app.route('/api/admin/logs', methods=['GET'])
@requires_auth(admin_required=True)
def view_all_logs():
    """Admin-only route to view all user activity logs."""
    try:
        # Fetch login activity logs
        login_logs_ref = db.collection(LOGIN_LOG_PATH).order_by('timestamp', direction=firestore.Query.DESCENDING).limit(100)
        login_logs = [doc.to_dict() for doc in login_logs_ref.stream()]

        # Fetch prediction logs
        prediction_logs_ref = db.collection(PREDICTION_LOG_PATH).order_by('timestamp', direction=firestore.Query.DESCENDING).limit(100)
        prediction_logs = [doc.to_dict() for doc in prediction_logs_ref.stream()]
        
        # Convert timestamps for JSON serialization
        for log in login_logs:
            if 'timestamp' in log and log['timestamp']:
                log['timestamp'] = log['timestamp'].isoformat()
        
        for log in prediction_logs:
            if 'timestamp' in log and log['timestamp']:
                log['timestamp'] = log['timestamp'].isoformat()
        
        return jsonify({
            "message": "Activity and Prediction logs retrieved successfully.",
            "login_activity_logs": login_logs,
            "prediction_logs": prediction_logs,
            "fetched_by": g.user_name
        }), 200

    except Exception as e:
        print(f"Error fetching logs: {e}")
        return jsonify({"error": "Failed to fetch logs"}), 500

# --- Health Check and Main Execution ---

@app.route('/', methods=['GET'])
def health_check():
    """Simple route to check if the server is running."""
    return jsonify({
        "status": "ok",
        "service": "Firebase Flask Backend",
        "app_id_path": APP_ID,
        "current_time": datetime.utcnow().isoformat()
    }), 200

if __name__ == '__main__':
    # Flask runs on port 5000 by default
    app.run(debug=True, host='0.0.0.0')
