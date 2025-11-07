#!/usr/bin/env python3
# ============================================
# FILE: backend/app.py
# Location: mindcare/backend/app.py
# Server code - All backend logic
# ============================================

import json
from datetime import datetime, timedelta
from functools import wraps
import jwt
import time

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import google.generativeai as genai
import requests

from dotenv import load_dotenv
import os

load_dotenv()

# ============================================
# Initialize Flask App
# ============================================

app = Flask(__name__)
CORS(app)

# ============================================
# Configuration
# ============================================

app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-key-change-in-production')

db = SQLAlchemy(app)

# Setup Gemini AI
try:
    genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
except:
    print("⚠️ Gemini API key not configured - AI features may not work")

# ============================================
# Database Models
# ============================================

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20))
    bio = db.Column(db.Text)
    preferences = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    
    conversations = db.relationship('Conversation', backref='user', lazy=True, cascade='all, delete-orphan')
    emotions = db.relationship('EmotionLog', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Conversation(db.Model):
    __tablename__ = 'conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255))
    description = db.Column(db.Text)
    mood_at_start = db.Column(db.String(50))
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime)
    message_count = db.Column(db.Integer, default=0)
    duration_minutes = db.Column(db.Integer)
    is_archived = db.Column(db.Boolean, default=False)
    
    messages = db.relationship('ChatMessage', backref='conversation', lazy=True, cascade='all, delete-orphan')

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.BigInteger, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message_type = db.Column(db.String(50), default='user')
    content = db.Column(db.Text, nullable=False)
    detected_emotion = db.Column(db.String(50))
    emotion_confidence = db.Column(db.Float, default=0.0)
    ai_model = db.Column(db.String(50))
    response_time_ms = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_edited = db.Column(db.Boolean, default=False)
    edited_at = db.Column(db.DateTime)
    is_deleted = db.Column(db.Boolean, default=False)
    deleted_at = db.Column(db.DateTime)

class EmotionLog(db.Model):
    __tablename__ = 'emotion_logs'
    
    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=True)
    emotion = db.Column(db.String(50), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    emotions_distribution = db.Column(db.JSON)
    face_detected = db.Column(db.Boolean, default=True)
    camera_used = db.Column(db.Boolean, default=True)
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)

# ============================================
# Authentication Middleware
# ============================================

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'message': 'Invalid token'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

# ============================================
# Helper Functions
# ============================================

def get_ai_response(user_message, emotion, user):
    """Get response from Gemini AI with emotion-based tone"""
    
    start_time = time.time()
    emotion_tones = {
        'sad': 'gentle, compassionate, and encouraging',
        'angry': 'calm, understanding, and supportive',
        'anxious': 'reassuring, grounding, and peaceful',
        'happy': 'warm, friendly, and celebratory',
        'neutral': 'supportive and helpful'
    }
    
    tone = emotion_tones.get(emotion.lower(), 'supportive and helpful')
    system_prompt = f"""You are MindCare, a warm, empathetic mental wellness companion. 
    The user is feeling {emotion}. Respond in a {tone} tone.
    Keep responses concise (2-3 sentences), personal, and actionable.
    Current user name: {user.name}"""
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(f"{system_prompt}\n\nUser: {user_message}")
        response_time = int((time.time() - start_time) * 1000)
        return response.text, 'gemini', response_time
    except Exception as e:
        print(f"Gemini error: {e}")
        return get_huggingface_response(user_message, emotion, user, start_time)

def get_huggingface_response(user_message, emotion, user, start_time):
    """Fallback to Hugging Face"""
    
    try:
        response = requests.post(
            "https://router.huggingface.co/hf-inference",
            headers={"Authorization": f"Bearer {os.getenv('HF_API_TOKEN')}"},
            json={
                "model": os.getenv("HF_MODEL"),
                "inputs": f"User feeling {emotion} says: {user_message}",
                "parameters": {
                    "max_new_tokens": 200,
                    "temperature": 0.7,
                }
            },
            timeout=20
        )


        response_time = int((time.time() - start_time) * 1000)
        
        if response.status_code == 200:
            result = response.json()
            if isinstance(result, list) and len(result) > 0:
                text = result[0].get("generated_text", "").strip()
            elif isinstance(result, dict) and "generated_text" in result:
                text = result["generated_text"].strip()
            else:
                text = "I'm listening. Tell me more about that."
            return text, "huggingface", response_time
        else:
            print(f"HuggingFace error: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"HuggingFace error: {e}")
    
    response_time = int((time.time() - start_time) * 1000)
    return "I'm here to listen and support you.", 'fallback', response_time

# ============================================
# Authentication Routes
# ============================================

@app.route('/user/register', methods=['POST'])
def register():
    """User registration"""
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({'message': 'Missing required fields'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already registered'}), 409
    
    try:
        user = User(name=data['name'], email=data['email'])
        user.set_password(data['password'])
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'message': 'User registered successfully',
            'user_id': user.id,
            'email': user.email
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

@app.route('/user/login', methods=['POST'])
def login():
    """User login"""
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing email or password'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'message': 'Invalid credentials'}), 401
    
    token = jwt.encode({
        'user_id': user.id,
        'exp': datetime.utcnow() + timedelta(days=30)
    }, app.config['SECRET_KEY'], algorithm='HS256')
    
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user_id': user.id,
        'name': user.name,
        'email': user.email
    }), 200

# ============================================
# Conversation Routes
# ============================================

@app.route('/conversation/start', methods=['POST'])
@token_required
def start_conversation(current_user):
    """Start new conversation"""
    data = request.get_json()
    
    try:
        conversation = Conversation(
            user_id=current_user.id,
            title=data.get('title', 'New Chat'),
            mood_at_start=data.get('emotion', 'neutral'),
            started_at=datetime.utcnow()
        )
        db.session.add(conversation)
        db.session.commit()
        
        return jsonify({
            'message': 'Conversation started',
            'conversation_id': conversation.id,
            'started_at': conversation.started_at.isoformat()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

# ============================================
# Chat Routes
# ============================================

@app.route('/chat', methods=['POST'])
@token_required
def chat(current_user):
    """Send message and get AI response"""
    data = request.get_json()
    
    if not data or not data.get('message'):
        return jsonify({'message': 'No message provided'}), 400
    
    user_message = data['message']
    emotion = data.get('emotion', 'neutral')
    conversation_id = data.get('conversation_id')
    
    try:
        # Get or create conversation
        if not conversation_id:
            conversation = Conversation(
                user_id=current_user.id,
                title='Chat Session',
                mood_at_start=emotion
            )
            db.session.add(conversation)
            db.session.flush()
            conversation_id = conversation.id
        else:
            conversation = Conversation.query.filter_by(id=conversation_id, user_id=current_user.id).first()
            if not conversation:
                return jsonify({'message': 'Conversation not found'}), 404
        
        # Store user message
        user_msg = ChatMessage(
            conversation_id=conversation_id,
            user_id=current_user.id,
            message_type='user',
            content=user_message,
            detected_emotion=emotion,
            emotion_confidence=data.get('emotion_confidence', 0.0),
            created_at=datetime.utcnow()
        )
        db.session.add(user_msg)
        db.session.flush()
        
        # Get AI response
        bot_response, model_used, response_time = get_ai_response(user_message, emotion, current_user)
        
        # Store bot message
        bot_msg = ChatMessage(
            conversation_id=conversation_id,
            user_id=current_user.id,
            message_type='bot',
            content=bot_response,
            detected_emotion=emotion,
            ai_model=model_used,
            response_time_ms=response_time,
            created_at=datetime.utcnow()
        )
        db.session.add(bot_msg)
        
        # Update conversation message count
        conversation.message_count = ChatMessage.query.filter_by(conversation_id=conversation_id).count()
        
        db.session.commit()
        
        return jsonify({
            'message': bot_response,
            'emotion': emotion,
            'conversation_id': conversation_id,
            'response_time_ms': response_time,
            'model_used': model_used,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

@app.route('/chat_history/<int:conversation_id>', methods=['GET'])
@token_required
def get_chat_history(current_user, conversation_id):
    """Get complete chat history"""
    conversation = Conversation.query.filter_by(id=conversation_id, user_id=current_user.id).first()
    
    if not conversation:
        return jsonify({'message': 'Conversation not found'}), 404
    
    messages = ChatMessage.query.filter_by(conversation_id=conversation_id).order_by(
        ChatMessage.created_at.asc()
    ).all()
    
    return jsonify({
        'conversation_id': conversation.id,
        'title': conversation.title,
        'mood_at_start': conversation.mood_at_start,
        'started_at': conversation.started_at.isoformat(),
        'ended_at': conversation.ended_at.isoformat() if conversation.ended_at else None,
        'message_count': len(messages),
        'messages': [{
            'id': msg.id,
            'type': msg.message_type,
            'content': msg.content,
            'emotion': msg.detected_emotion,
            'timestamp': msg.created_at.isoformat()
        } for msg in messages]
    }), 200

@app.route('/conversations', methods=['GET'])
@token_required
def get_conversations(current_user):
    """Get all conversations"""
    conversations = Conversation.query.filter_by(user_id=current_user.id).order_by(
        Conversation.started_at.desc()
    ).all()
    
    return jsonify({
        'total_conversations': len(conversations),
        'conversations': [{
            'id': c.id,
            'title': c.title,
            'mood_at_start': c.mood_at_start,
            'started_at': c.started_at.isoformat(),
            'message_count': c.message_count
        } for c in conversations]
    }), 200

# ============================================
# Emotion Routes
# ============================================

@app.route('/log_emotion', methods=['POST'])
@token_required
def log_emotion(current_user):
    """Log detected emotion"""
    data = request.get_json()
    
    if not data or not data.get('emotion'):
        return jsonify({'message': 'Emotion data required'}), 400
    
    try:
        emotion_log = EmotionLog(
            user_id=current_user.id,
            emotion=data['emotion'],
            confidence=data.get('confidence', 0.0),
            emotions_distribution=data.get('emotions_distribution'),
            detected_at=datetime.utcnow()
        )
        db.session.add(emotion_log)
        db.session.commit()
        
        return jsonify({'message': 'Emotion logged successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

@app.route('/mood_stats/<int:user_id>', methods=['GET'])
@token_required
def get_mood_stats(current_user, user_id):
    """Get mood statistics"""
    if current_user.id != user_id:
        return jsonify({'message': 'Unauthorized'}), 403
    
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    emotions = EmotionLog.query.filter(
        EmotionLog.user_id == user_id,
        EmotionLog.detected_at >= seven_days_ago
    ).all()
    
    emotion_counts = {}
    daily_data = {}
    
    for emotion_record in emotions:
        date = emotion_record.detected_at.date().isoformat()
        emotion_name = emotion_record.emotion
        
        emotion_counts[emotion_name] = emotion_counts.get(emotion_name, 0) + 1
        if date not in daily_data:
            daily_data[date] = {}
        daily_data[date][emotion_name] = daily_data[date].get(emotion_name, 0) + 1
    
    return jsonify({
        'emotion_counts': emotion_counts,
        'daily_trends': daily_data,
        'total_readings': len(emotions)
    }), 200

@app.route('/dashboard/summary/<int:user_id>', methods=['GET'])
@token_required
def get_dashboard_summary(current_user, user_id):
    """Get dashboard summary"""
    if current_user.id != user_id:
        return jsonify({'message': 'Unauthorized'}), 403
    
    today = datetime.utcnow().date()
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    today_messages = ChatMessage.query.filter(
        ChatMessage.user_id == user_id,
        db.func.date(ChatMessage.created_at) == today,
        ChatMessage.message_type == 'user'
    ).count()
    
    today_emotions = EmotionLog.query.filter(
        EmotionLog.user_id == user_id,
        db.func.date(EmotionLog.detected_at) == today
    ).count()
    
    week_conversations = Conversation.query.filter(
        Conversation.user_id == user_id,
        Conversation.started_at >= seven_days_ago
    ).count()
    
    week_messages = ChatMessage.query.filter(
        ChatMessage.user_id == user_id,
        ChatMessage.created_at >= seven_days_ago,
        ChatMessage.message_type == 'user'
    ).count()
    
    emotions = EmotionLog.query.filter(
        EmotionLog.user_id == user_id,
        EmotionLog.detected_at >= seven_days_ago
    ).all()
    
    emotion_counts = {}
    for e in emotions:
        emotion_counts[e.emotion] = emotion_counts.get(e.emotion, 0) + 1
    
    return jsonify({
        'today': {
            'messages': today_messages,
            'emotions_logged': today_emotions
        },
        'last_7_days': {
            'conversations': week_conversations,
            'messages': week_messages,
            'emotions': len(emotions),
            'emotion_breakdown': emotion_counts
        },
        'all_time': {
            'total_conversations': Conversation.query.filter_by(user_id=user_id).count(),
            'total_messages': ChatMessage.query.filter_by(user_id=user_id).count(),
            'total_emotions': EmotionLog.query.filter_by(user_id=user_id).count()
        }
    }), 200

# ============================================
# Health Check
# ============================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat()
    }), 200

# ============================================
# Error Handlers
# ============================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'message': 'Internal server error'}), 500

# ============================================
# Database Initialization & Run
# ============================================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("✅ Database tables created successfully")
        print("✅ MindCare Backend Starting...")
        print(f"✅ Running on http://localhost:5000")
        print("✅ Press CTRL+C to stop")
    
    app.run(debug=True, host='0.0.0.0', port=5000)