// Chatbot Application
class MindCareChatbot {
    constructor() {
        this.messages = [
            {
                id: 1,
                text: "Hello! I'm MindCare AI, your personal mental health companion. I'm here to listen, support, and guide you through whatever you're experiencing. Whether you're dealing with stress, anxiety, loneliness, or just need someone to talk to, I'm available 24/7. What's on your mind today?",
                sender: 'bot',
                timestamp: new Date(),
                liked: null
            }
        ];
        this.sidebarOpen = true;
        this.hoveredMessageId = null;
        this.isLoading = false;
        
        this.botResponses = [
            "That's really important. Let me understand better - can you describe how this situation started and what specifically is bothering you most?",
            "I appreciate you sharing that. It sounds like you're carrying a lot right now. What do you think would help you feel even a little bit better today?",
            "Many people experience what you're describing, and I want you to know your feelings are completely valid. Have you noticed any patterns to when you feel this way?",
            "That takes courage to admit. I'm glad you're expressing this. What support do you currently have around you?",
            "I'm listening. It sounds like this has been weighing on you. What's the hardest part about this situation for you?",
            "You're showing real self-awareness by recognizing this. Let's explore what might help - what have you tried so far that hasn't worked?",
            "That's a significant challenge. I'm curious - when you think about solutions, what comes to mind first? What feels most achievable to you?",
            "I hear the frustration in what you're saying. Sometimes these situations feel overwhelming. What would feel like progress to you?",
        ];

        this.quickStarters = [
            { icon: "😰", text: "I'm feeling anxious" },
            { icon: "😢", text: "I need to talk about depression" },
            { icon: "💤", text: "Help with sleep issues" },
            { icon: "💪", text: "Coping strategies" },
        ];

        this.init();
    }

    init() {
        this.render();
        this.attachEventListeners();
    }

    render() {
        const app = document.getElementById('chatbot-app');
        app.innerHTML = `
            <nav>
                <ul>
                    <li><a href="login.html" class="signin-link">Sign In</a></li>
                    <li><a href="index.html">Home</a></li>
                    <li><a href="chatbot.html" class="active">Chatbot</a></li>
                    <li><a href="community.html">WhatsApp Community</a></li>
                    <li><a href="premium.html">Premium</a></li>
                    <li><a href="prescription.html">Doctor Prescription</a></li>
                    <li><a href="about.html">About Us</a></li>
                </ul>
            </nav>

            <div class="chatbot-container">
                <!-- Sidebar -->
                <div class="sidebar ${!this.sidebarOpen ? 'closed' : ''}">
                    <div class="sidebar-header">
                        <button class="new-chat-btn" id="newChatBtn">➕ New chat</button>
                    </div>
                    
                    <div class="search-box">
                        <span>🔍</span>
                        <input type="text" placeholder="Search chats...">
                    </div>

                    <div class="chat-history">
                        <div class="history-title">TODAY</div>
                        <button class="history-item active" id="chat-1">💬 Mental health support</button>
                        <button class="history-item" id="chat-2">💬 Chat conversation 2</button>
                        <button class="history-item" id="chat-3">💬 Chat conversation 3</button>
                    </div>

                    <div class="sidebar-footer">
                        <button class="footer-btn">⚙️ Settings</button>
                        <button class="footer-btn">🚪 Log out</button>
                    </div>
                </div>

                <!-- Main Chat -->
                <div class="main-chat">
                    <!-- Header -->
                    <div class="chat-header">
                        <div class="header-left">
                            <button class="toggle-btn" id="toggleSidebarBtn">☰</button>
                            <div class="header-info">
                                <h1>MindCare AI</h1>
                                <p>Always here for you</p>
                            </div>
                        </div>
                        <button class="header-icon">⚡</button>
                    </div>

                    <!-- Messages -->
                    <div class="messages-container" id="messagesContainer">
                        ${this.renderMessages()}
                    </div>

                    <!-- Input -->
                    <div class="input-container">
                        <div class="input-wrapper">
                            <input type="text" id="messageInput" placeholder="Message MindCare AI..." />
                            <button class="send-btn" id="sendBtn">📤</button>
                        </div>
                        <p class="input-disclaimer">MindCare AI can make mistakes. For emergencies, please contact local emergency services.</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderMessages() {
        if (this.messages.length === 1) {
            return `
                <div class="welcome-section">
                    <div class="welcome-icon">🧠</div>
                    <h2 class="welcome-title">Welcome to MindCare</h2>
                    <p class="welcome-text">Your personal AI companion for mental wellness. I'm here to listen, support, and guide you.</p>
                    <div class="quick-starters">
                        ${this.quickStarters.map((starter, idx) => `
                            <button class="quick-start-btn" data-index="${idx}">
                                <span class="quick-start-emoji">${starter.icon}</span>
                                ${starter.text}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        return this.messages.map(msg => `
            <div class="message ${msg.sender === 'user' ? 'user-message' : 'bot-message'}" data-id="${msg.id}">
                ${msg.sender === 'bot' ? `<div class="bot-avatar">🤖</div>` : ''}
                <div class="message-content">
                    <div class="message-bubble">${this.escapeHtml(msg.text)}</div>
                    ${msg.sender === 'bot' ? `
                        <div class="message-actions">
                            <button class="action-btn like-btn ${msg.liked === true ? 'liked' : ''}" data-id="${msg.id}" data-type="like">👍</button>
                            <button class="action-btn dislike-btn ${msg.liked === false ? 'liked' : ''}" data-id="${msg.id}" data-type="dislike">👎</button>
                            <button class="action-btn copy-btn" data-id="${msg.id}" data-type="copy">📋</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('') + (this.isLoading ? `
            <div class="loading">
                <div class="bot-avatar">🤖</div>
                <div style="display: flex; gap: 0.4rem;">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
            </div>
        ` : '');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    attachEventListeners() {
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        const toggleBtn = document.getElementById('toggleSidebarBtn');
        const newChatBtn = document.getElementById('newChatBtn');
        const messagesContainer = document.getElementById('messagesContainer');

        if (!messageInput) return;

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleSidebar());
        }

        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => this.newChat());
        }

        if (messagesContainer) {
            messagesContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('quick-start-btn')) {
                    const idx = e.target.dataset.index;
                    messageInput.value = this.quickStarters[idx].text;
                    messageInput.focus();
                }
                if (e.target.classList.contains('like-btn')) {
                    const id = parseInt(e.target.dataset.id);
                    this.updateLike(id, true);
                }
                if (e.target.classList.contains('dislike-btn')) {
                    const id = parseInt(e.target.dataset.id);
                    this.updateLike(id, false);
                }
                if (e.target.classList.contains('copy-btn')) {
                    const id = parseInt(e.target.dataset.id);
                    const msg = this.messages.find(m => m.id === id);
                    if (msg) {
                        navigator.clipboard.writeText(msg.text).then(() => {
                            alert('Message copied to clipboard!');
                        });
                    }
                }
            });
        }
    }

    sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();

        if (!text) return;

        // Add user message
        this.messages.push({
            id: this.messages.length + 1,
            text: text,
            sender: 'user',
            timestamp: new Date()
        });

        input.value = '';
        this.isLoading = true;
        this.render();
        this.attachEventListeners();
        this.scrollToBottom();

        // Simulate bot response
        setTimeout(() => {
            this.messages.push({
                id: this.messages.length + 1,
                text: this.botResponses[Math.floor(Math.random() * this.botResponses.length)],
                sender: 'bot',
                timestamp: new Date(),
                liked: null
            });
            this.isLoading = false;
            this.render();
            this.attachEventListeners();
            this.scrollToBottom();
        }, 1500);
    }

    updateLike(id, value) {
        const msg = this.messages.find(m => m.id === id);
        if (msg) {
            msg.liked = msg.liked === value ? null : value;
            this.render();
            this.attachEventListeners();
        }
    }

    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        this.render();
        this.attachEventListeners();
    }

    newChat() {
        this.messages = [this.messages[0]];
        this.render();
        this.attachEventListeners();
    }

    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 10);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new MindCareChatbot();
});