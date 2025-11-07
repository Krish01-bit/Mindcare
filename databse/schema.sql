-- ============================================
-- FILE: database/schema.sql
-- Location: mindcare/database/schema.sql
-- Database tables - All SQL queries
-- ============================================

-- Create Database
CREATE DATABASE IF NOT EXISTS mindcare_db;
USE mindcare_db;

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    bio TEXT,
    preferences JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_email (email),
    INDEX idx_created_at (created_at),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    mood_at_start VARCHAR(50),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    message_count INT DEFAULT 0,
    duration_minutes INT,
    is_archived BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_started_at (started_at),
    INDEX idx_is_archived (is_archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. CHAT_MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    message_type ENUM('user', 'bot', 'system') DEFAULT 'user',
    content TEXT NOT NULL,
    detected_emotion VARCHAR(50),
    emotion_confidence FLOAT DEFAULT 0.0,
    ai_model VARCHAR(50),
    response_time_ms INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at DATETIME,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_message_type (message_type),
    INDEX idx_detected_emotion (detected_emotion),
    INDEX idx_is_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. EMOTION_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS emotion_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    conversation_id INT,
    emotion VARCHAR(50) NOT NULL,
    confidence FLOAT NOT NULL,
    emotions_distribution JSON,
    face_detected BOOLEAN DEFAULT TRUE,
    camera_used BOOLEAN DEFAULT TRUE,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_emotion (emotion),
    INDEX idx_detected_at (detected_at),
    INDEX idx_conversation_id (conversation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. MOOD_HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS mood_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    dominant_emotion VARCHAR(50),
    average_confidence FLOAT,
    emotion_counts JSON,
    total_emotions_detected INT,
    total_messages INT,
    total_conversations INT,
    average_sentiment FLOAT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_user_id (user_id),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. AI_RESPONSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_responses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    chat_message_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    model_name VARCHAR(100),
    temperature FLOAT,
    tokens_used INT,
    cost DECIMAL(10, 6),
    was_regenerated BOOLEAN DEFAULT FALSE,
    regenerated_at DATETIME,
    user_feedback ENUM('helpful', 'not_helpful', 'inaccurate', 'none') DEFAULT 'none',
    feedback_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (chat_message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_model_name (model_name),
    INDEX idx_created_at (created_at),
    INDEX idx_user_feedback (user_feedback)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. CHAT_FEEDBACK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chat_feedback (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chat_message_id BIGINT NOT NULL,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    relevance_score INT CHECK (relevance_score >= 1 AND relevance_score <= 5),
    tone_score INT CHECK (tone_score >= 1 AND tone_score <= 5),
    helpfulness_score INT CHECK (helpfulness_score >= 1 AND helpfulness_score <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (chat_message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_rating (rating),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. ACTIVITY_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at),
    INDEX idx_entity_type (entity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. USER_ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    total_conversations INT DEFAULT 0,
    total_messages INT DEFAULT 0,
    total_emotions_logged INT DEFAULT 0,
    average_session_duration INT,
    most_common_emotion VARCHAR(50),
    last_conversation_date DATETIME,
    daily_active_days INT DEFAULT 0,
    weekly_active_days INT DEFAULT 0,
    monthly_active_days INT DEFAULT 0,
    engagement_score INT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_engagement_score (engagement_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 11. WELLBEING_TIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS wellbeing_tips (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    tip_content TEXT NOT NULL,
    category VARCHAR(50),
    based_on_emotion VARCHAR(50),
    created_date DATE DEFAULT CURDATE(),
    is_read BOOLEAN DEFAULT FALSE,
    read_at DATETIME,
    is_helpful BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_date (created_date),
    INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 12. CHAT_KEYWORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chat_keywords (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chat_message_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    frequency INT DEFAULT 1,
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (chat_message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_keyword (keyword),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VERIFICATION
-- ============================================
-- Show all tables created
SHOW TABLES;

-- Show table structures
DESCRIBE users;
DESCRIBE chat_messages;
DESCRIBE emotion_logs;
DESCRIBE conversations;

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert test user
INSERT INTO users (name, email, password_hash) VALUES 
('Test User', 'test@example.com', 'hashed_password_here');

-- Insert test conversation
INSERT INTO conversations (user_id, title, mood_at_start, started_at) VALUES 
(1, 'Test Chat', 'neutral', NOW());

-- Insert test messages
INSERT INTO chat_messages (conversation_id, user_id, message_type, content, detected_emotion) VALUES 
(1, 1, 'user', 'Hello!', 'happy'),
(1, 1, 'bot', 'Hi there! How are you?', 'neutral');

-- Insert test emotion
INSERT INTO emotion_logs (user_id, conversation_id, emotion, confidence) VALUES 
(1, 1, 'happy', 0.85);

-- ============================================
-- END OF SCHEMA
-- ============================================