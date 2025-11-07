// FILE: app.js - ALL JAVASCRIPT LOGIC

const API_URL = 'http://localhost:5000';
let authToken = localStorage.getItem('authToken');
let currentUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;
let currentEmotion = 'neutral';
let currentConversationId = null;
let cameraStream = null;
let isCameraOn = false;

// ============================================
// Initialize App
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    if (authToken && currentUser) {
        showDashboard();
        loadMoodStats();
    } else {
        showLogin();
    }
});

// ============================================
// Auth Functions
// ============================================

function showLogin() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('dashboardContainer').style.display = 'none';
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('registerPage').style.display = 'none';
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

function showRegister() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('registerPage').style.display = 'flex';
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

function showDashboard() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('dashboardContainer').style.display = 'flex';
    document.getElementById('welcomeText').textContent = `Welcome, ${currentUser.name}! 💙`;
}

async function handleLogin(e) {
    e.preventDefault();
    showLoading(true);

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch(`${API_URL}/user/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Login failed');
        }

        const data = await response.json();
        authToken = data.token;
        currentUser = { id: data.user_id, name: data.name, email: data.email };

        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        document.getElementById('loginForm').reset();
        showDashboard();
        startNewConversation();
        loadMoodStats();
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.style.display = 'block';
    } finally {
        showLoading(false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    showLoading(true);

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const errorDiv = document.getElementById('registerError');

    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        showLoading(false);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/user/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Registration failed');
        }

        document.getElementById('registerForm').reset();
        alert('Registration successful! Please log in.');
        showLogin();
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.style.display = 'block';
    } finally {
        showLoading(false);
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    document.getElementById('chatBox').innerHTML = '<div class="empty-state"><h2>Hello! 👋</h2><p>I\'m here to listen and support you.</p><p>Share whatever\'s on your mind.</p></div>';
    showLogin();
}

// ============================================
// Chat Functions
// ============================================

async function startNewConversation() {
    try {
        const response = await fetch(`${API_URL}/conversation/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                title: `Chat - ${new Date().toLocaleDateString()}`,
                emotion: currentEmotion
            })
        });

        if (response.ok) {
            const data = await response.json();
            currentConversationId = data.conversation_id;
        }
    } catch (err) {
        console.error('Error starting conversation:', err);
    }
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message) return;

    addMessageToChat(message, 'user');
    input.value = '';

    try {
        showLoading(true);

        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                message,
                emotion: currentEmotion,
                conversation_id: currentConversationId
            })
        });

        if (response.ok) {
            const data = await response.json();
            addMessageToChat(data.message, 'bot');
            loadMoodStats();
        }
    } catch (err) {
        console.error('Error sending message:', err);
    } finally {
        showLoading(false);
    }
}

function addMessageToChat(content, role) {
    const chatBox = document.getElementById('chatBox');
    
    // Remove empty state if exists
    const emptyState = chatBox.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>${escapeHtml(content)}</p>
            <span class="message-time">${time}</span>
        </div>
    `;

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Camera & Emotion Detection
// ============================================

async function toggleCamera() {
    const btn = document.getElementById('cameraBtn');
    const video = document.getElementById('cameraVideo');

    if (!isCameraOn) {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 400, height: 400 } 
            });
            video.srcObject = cameraStream;
            video.style.display = 'block';
            isCameraOn = true;
            btn.textContent = '⏹️ Stop Camera';
            
            // Start emotion detection
            detectEmotion();
        } catch (err) {
            alert('Camera permission denied or camera not available');
        }
    } else {
        cameraStream.getTracks().forEach(track => track.stop());
        video.style.display = 'none';
        isCameraOn = false;
        btn.textContent = '📷 Start Camera';
    }
}

async function detectEmotion() {
    if (!isCameraOn) return;

    // Simulating emotion detection (in real app, use face-api.js or MediaPipe)
    const emotions = ['happy', 'sad', 'anxious', 'calm', 'neutral', 'angry'];
    
    const interval = setInterval(async () => {
        if (!isCameraOn) {
            clearInterval(interval);
            return;
        }

        // Random emotion simulation (replace with actual ML detection)
        const emotion = emotions[Math.floor(Math.random() * emotions.length)];
        const confidence = Math.random() * 0.5 + 0.5;

        currentEmotion = emotion;
        document.getElementById('emotionValue').textContent = emotion.toUpperCase();

        // Log emotion
        try {
            await fetch(`${API_URL}/log_emotion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    emotion,
                    confidence,
                    emotions_distribution: { [emotion]: confidence }
                })
            });
        } catch (err) {
            console.error('Error logging emotion:', err);
        }
    }, 1000);
}

// ============================================
// Tab Switching
// ============================================

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const tabId = tabName === 'chat' ? 'chatTab' : 
                  tabName === 'analytics' ? 'analyticsTab' : 'historyTab';
    document.getElementById(tabId).classList.add('active');

    // Add active class to clicked button
    event.target.classList.add('active');

    if (tabName === 'analytics') {
        loadAnalytics();
    } else if (tabName === 'history') {
        loadHistory();
    }
}

// ============================================
// Analytics
// ============================================

async function loadMoodStats() {
    try {
        const response = await fetch(`${API_URL}/mood_stats/${currentUser.id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            displayMoodChart(data);
        }
    } catch (err) {
        console.error('Error loading mood stats:', err);
    }
}

function displayMoodChart(data) {
    const container = document.getElementById('moodChartContainer');
    
    if (!data.emotion_counts || Object.keys(data.emotion_counts).length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">No emotion data yet</p>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
    
    Object.entries(data.emotion_counts).forEach(([emotion, count]) => {
        const colors = {
            happy: '#FFD93D',
            sad: '#6C8EBF',
            angry: '#FF6B6B',
            anxious: '#FFA500',
            calm: '#90EE90',
            neutral: '#9DB4C4'
        };
        
        const color = colors[emotion] || '#808080';
        const width = (count / Math.max(...Object.values(data.emotion_counts))) * 100;
        
        html += `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 80px; font-size: 12px;">${emotion}</span>
                <div style="flex: 1; height: 20px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${width}%; height: 100%; background: ${color};"></div>
                </div>
                <span style="width: 30px; font-size: 12px; text-align: right;">${count}</span>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

async function loadAnalytics() {
    try {
        const response = await fetch(`${API_URL}/dashboard/summary/${currentUser.id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('todayMessages').textContent = data.today.messages;
            document.getElementById('todayEmotions').textContent = data.today.emotions_logged;
            document.getElementById('weekConversations').textContent = data.last_7_days.conversations;
            document.getElementById('totalConversations').textContent = data.all_time.total_conversations;

            // Display emotion breakdown
            const breakdown = document.getElementById('emotionBreakdown');
            let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
            
            Object.entries(data.last_7_days.emotion_breakdown).forEach(([emotion, count]) => {
                html += `
                    <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8f9fb; border-radius: 4px;">
                        <span>${emotion}</span>
                        <strong>${count}</strong>
                    </div>
                `;
            });
            
            html += '</div>';
            breakdown.innerHTML = html;
        }
    } catch (err) {
        console.error('Error loading analytics:', err);
    }
}

// ============================================
// Chat History
// ============================================

async function loadHistory() {
    try {
        const response = await fetch(`${API_URL}/conversations`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            displayConversations(data.conversations);
        }
    } catch (err) {
        console.error('Error loading history:', err);
    }
}

function displayConversations(conversations) {
    const list = document.getElementById('conversationsList');
    
    if (conversations.length === 0) {
        list.innerHTML = '<p style="color: #999; text-align: center;">No conversations yet</p>';
        return;
    }

    list.innerHTML = conversations.map(conv => `
        <div class="conversation-item" onclick="loadConversationMessages(${conv.id})">
            <div style="margin-bottom: 8px;">
                <strong>${conv.title}</strong>
                <span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 12px;">
                    ${conv.mood_at_start}
                </span>
            </div>
            <div style="font-size: 12px; color: #999;">
                ${new Date(conv.started_at).toLocaleDateString()} • ${conv.message_count} messages
            </div>
        </div>
    `).join('');
}

async function loadConversationMessages(conversationId) {
    try {
        const response = await fetch(`${API_URL}/chat_history/${conversationId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            displayMessages(data.messages);
        }
    } catch (err) {
        console.error('Error loading messages:', err);
    }
}

function displayMessages(messages) {
    const display = document.getElementById('messagesDisplay');
    
    if (messages.length === 0) {
        display.innerHTML = '<p style="color: #999; text-align: center;">No messages in this conversation</p>';
        return;
    }

    display.innerHTML = messages.map(msg => {
        const time = new Date(msg.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const isUser = msg.type === 'user';
        
        return `
            <div style="margin-bottom: 12px; text-align: ${isUser ? 'right' : 'left'};">
                <div style="
                    display: inline-block;
                    max-width: 70%;
                    padding: 12px 16px;
                    border-radius: 12px;
                    background: ${isUser ? '#6366f1' : '#e5e7eb'};
                    color: ${isUser ? 'white' : '#1f2937'};
                ">
                    <p style="margin: 0;">${escapeHtml(msg.content)}</p>
                    <span style="font-size: 11px; opacity: 0.7; display: block; margin-top: 4px;">
                        ${time}
                        ${msg.emotion ? ` • ${msg.emotion}` : ''}
                    </span>
                </div>
            </div>
        `;
    }).join('');

    display.scrollTop = display.scrollHeight;
}

// ============================================
// Utilities
// ============================================

function showLoading(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none';
}