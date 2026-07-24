// AutoFlow Studio - Tools JavaScript
// Complete rewrite with working video controls and all other functions preserved

document.addEventListener('DOMContentLoaded', () => {
    initializeToolsFAB();
    initializePricingCalculator();
    initializeEnhancedChatbot();
    initializeVideoControls(); // Initialize video controls
});

/**
 * Initialize the floating action button (FAB) tools menu
 */
function initializeToolsFAB() {
    const toolsContainer = document.getElementById('tools-fab-container');
    const mainFab = document.getElementById('main-fab');
    const openCalculatorBtn = document.getElementById('open-calculator-btn');
    const openChatbotBtn = document.getElementById('open-chatbot-btn');
    
    if (!toolsContainer || !mainFab) return;
    
    let isMenuOpen = false;
    
    function toggleToolsMenu() {
        isMenuOpen = !isMenuOpen;
        toolsContainer.classList.toggle('menu-open', isMenuOpen);
        mainFab.setAttribute('aria-expanded', isMenuOpen);
        mainFab.setAttribute('aria-label', isMenuOpen ? 'Close tools menu' : 'Open tools menu');
        announceToScreenReader(isMenuOpen ? 'Tools menu opened' : 'Tools menu closed');
    }
    
    function closeToolsMenu() {
        if (isMenuOpen) {
            isMenuOpen = false;
            toolsContainer.classList.remove('menu-open');
            mainFab.setAttribute('aria-expanded', 'false');
            mainFab.setAttribute('aria-label', 'Open tools menu');
        }
    }
    
    mainFab.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleToolsMenu();
    });
    
    mainFab.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleToolsMenu();
        } else if (e.key === 'Escape' && isMenuOpen) {
            closeToolsMenu();
        }
    });
    
    if (openCalculatorBtn) {
        openCalculatorBtn.addEventListener('click', () => {
            showModal('calculator-modal-overlay');
            closeToolsMenu();
        });
        
        openCalculatorBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showModal('calculator-modal-overlay');
                closeToolsMenu();
            }
        });
    }
    
    if (openChatbotBtn) {
        openChatbotBtn.addEventListener('click', () => {
            showModal('chatbot-modal-overlay');
            closeToolsMenu();
        });
        
        openChatbotBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showModal('chatbot-modal-overlay');
                closeToolsMenu();
            }
        });
    }
    
    document.addEventListener('click', (e) => {
        if (!toolsContainer.contains(e.target)) {
            closeToolsMenu();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMenuOpen) {
            closeToolsMenu();
            mainFab.focus();
        }
    });
    
    mainFab.setAttribute('aria-expanded', 'false');
    mainFab.setAttribute('aria-label', 'Open tools menu');
    mainFab.setAttribute('role', 'button');
    mainFab.setAttribute('tabindex', '0');
    
    const toolItems = toolsContainer.querySelectorAll('.tool-item');
    toolItems.forEach((item, index) => {
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.setAttribute('aria-label', item.querySelector('.tool-label').textContent);
    });
}

/**
 * Initialize the pricing calculator
 */
function initializePricingCalculator() {
    const calculatorModalOverlay = document.getElementById('calculator-modal-overlay');
    const closeCalculatorBtn = document.getElementById('close-calculator-modal-btn');
    const proceedButton = document.getElementById('proceed-button');
    const form = document.getElementById('pricing-calculator-form');
    
    const teamSizeEl = document.getElementById('team-size');
    const numTasksEl = document.getElementById('num-tasks');
    const taskComplexityEl = document.getElementById('task-complexity');
    const managementOptionEl = document.getElementById('management-option');
    const supportPlanEl = document.getElementById('support-plan');
    
    const oneTimePriceEl = document.getElementById('one-time-price');
    const monthlyPriceContainerEl = document.getElementById('monthly-price-container');
    const monthlyPriceEl = document.getElementById('monthly-price');
    
    if (!form) return;
    
    const pricing = {
        teamMultipliers: {
            'solo': 1,
            'growing': 1.25,
            'established': 1.75
        },
        taskPricing: {
            'simple': 100,
            'smart': 250,
            'advanced': 400
        },
        addons: {
            sheetsControls: 150,
            customDashboard: 350
        },
        monthly: {
            supportPlan: 50
        }
    };
    
    function calculatePrice() {
        if (!teamSizeEl || !numTasksEl || !taskComplexityEl || !managementOptionEl) return;
        
        const teamSize = teamSizeEl.value;
        const numTasks = parseInt(numTasksEl.value || '1', 10);
        const taskComplexity = taskComplexityEl.value;
        const managementOption = managementOptionEl.value;
        const hasSupportPlan = supportPlanEl?.checked || false;
        
        const taskPrice = pricing.taskPricing[taskComplexity];
        const teamMultiplier = pricing.teamMultipliers[teamSize];
        const coreCost = (numTasks * taskPrice) * teamMultiplier;
        
        let oneTimeTotal = coreCost;
        if (managementOption === 'sheets-controls') {
            oneTimeTotal += pricing.addons.sheetsControls;
        } else if (managementOption === 'custom-dashboard') {
            oneTimeTotal += pricing.addons.customDashboard;
        }
        
        let monthlyTotal = 0;
        if (hasSupportPlan) {
            monthlyTotal += pricing.monthly.supportPlan;
        }
        
        if (oneTimePriceEl) {
            oneTimePriceEl.textContent = `€${oneTimeTotal.toLocaleString('en-US')}`;
        }
        
        if (monthlyPriceContainerEl) {
            if (monthlyTotal > 0) {
                monthlyPriceContainerEl.style.display = 'block';
                if (monthlyPriceEl) {
                    monthlyPriceEl.textContent = `€${monthlyTotal} / month`;
                }
            } else {
                monthlyPriceContainerEl.style.display = 'none';
            }
        }
        
        announceToScreenReader(`Price updated to ${oneTimeTotal} euros one-time${monthlyTotal > 0 ? ` plus ${monthlyTotal} euros monthly` : ''}`);
        
        return { oneTime: oneTimeTotal, monthly: monthlyTotal };
    }
    
    if (form) {
        form.addEventListener('input', calculatePrice);
        form.addEventListener('change', calculatePrice);
    }
    
    if (numTasksEl) {
        numTasksEl.addEventListener('input', (e) => {
            let value = parseInt(e.target.value, 10);
            
            if (isNaN(value) || value < 1) {
                e.target.value = 1;
            } else if (value > 10) {
                e.target.value = 10;
                if (window.AutoFlowStudio?.showNotification) {
                    window.AutoFlowStudio.showNotification('Maximum 10 tasks allowed for instant quote', 'info');
                }
            }
            calculatePrice();
        });
    }
    
    if (closeCalculatorBtn) {
        closeCalculatorBtn.addEventListener('click', () => {
            hideModal('calculator-modal-overlay');
        });
    }
    
    if (calculatorModalOverlay) {
        calculatorModalOverlay.addEventListener('click', (e) => {
            if (e.target === calculatorModalOverlay) {
                hideModal('calculator-modal-overlay');
            }
        });
    }
    
    if (proceedButton) {
        proceedButton.addEventListener('click', () => {
            hideModal('calculator-modal-overlay');
        });
    }
    
    calculatePrice();
}

/**
 * Initialize enhanced chatbot
 */
function initializeEnhancedChatbot() {
    const chatbotModalOverlay = document.getElementById('chatbot-modal-overlay');
    const closeChatbotBtn = document.getElementById('close-chatbot-modal-btn');
    const chatMessages = document.querySelector('.chat-messages');
    const chatInput = document.querySelector('.chat-input-area input');
    const chatSendBtn = document.querySelector('.chat-send-btn');
    
    if (!chatbotModalOverlay) return;
    
    if (window.AUTOFLOW_CHATBOT_INSTANCE) {
        console.log('🔄 Chatbot instance already exists, destroying and recreating...');
        if (window.AUTOFLOW_CHATBOT_INSTANCE.cleanup) {
            try {
                window.AUTOFLOW_CHATBOT_INSTANCE.cleanup().catch(e => 
                    console.log('⚠️ Async cleanup error:', e)
                );
            } catch (e) {
                console.log('⚠️ Cleanup error:', e);
            }
        }
        delete window.AUTOFLOW_CHATBOT_INSTANCE;
        console.log('✅ Previous instance destroyed');
    }
    
    console.log('🚀 Initializing NEW chatbot instance...');
    
    let userId = null;
    let supabaseClient = null;
    let isHumanMode = false;
    let currentStep = 'welcome';
    let typingTimeout = null;
    let isUserTyping = false;
    let lastActivity = Date.now();
    let sessionActive = false;
    let heartbeatInterval = null;
    
    const chatbotInstance = {
        activeSubscription: null,
        messageSet: new Set(),
        isInitialized: false,
        lastMessageTime: 0,
        cleanup: async function() {
            console.log('🧹 AGGRESSIVE CLEANUP: Destroying all subscriptions...');
            
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }
            
            if (sessionActive && userId && supabaseClient) {
                try {
                    await supabaseClient
                        .from('live_chats')
                        .update({ is_active: false })
                        .eq('user_id', userId)
                        .eq('is_active', true);
                    console.log('✅ Session marked as inactive');
                } catch (e) {
                    console.log('⚠️ Session cleanup error:', e);
                }
            }
            
            if (this.activeSubscription) {
                try {
                    await this.activeSubscription.unsubscribe();
                    console.log('✅ Subscription unsubscribed');
                } catch (e) {
                    console.log('⚠️ Subscription cleanup error:', e);
                }
                this.activeSubscription = null;
            }
            if (supabaseClient) {
                try {
                    await supabaseClient.removeAllChannels();
                    console.log('✅ All channels removed');
                } catch (e) {
                    console.log('⚠️ Channel cleanup error:', e);
                }
            }
            this.messageSet.clear();
            this.isInitialized = false;
            sessionActive = false;
            console.log('✅ Aggressive cleanup complete');
        }
    };
    
    window.AUTOFLOW_CHATBOT_INSTANCE = chatbotInstance;
    
    const SUPABASE_URL = window.AUTOFLOW_CONFIG?.SUPABASE_CONFIG?.SUPABASE_URL || null;
    const SUPABASE_ANON_KEY = window.AUTOFLOW_CONFIG?.SUPABASE_CONFIG?.SUPABASE_ANON_KEY || null;
    
    function initializeUserId() {
        userId = localStorage.getItem('chatbot_user_id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('chatbot_user_id', userId);
        }
        console.log('🆔 User ID:', userId);
    }
    
    function startHeartbeat() {
        if (heartbeatInterval) return;
        
        heartbeatInterval = setInterval(async () => {
            if (!sessionActive || !supabaseClient || !userId) return;
            
            try {
                await supabaseClient
                    .from('live_chats')
                    .insert([{
                        user_id: userId,
                        from_user: 'heartbeat',
                        message: 'session_active',
                        timestamp: new Date().toISOString(),
                        is_active: true
                    }]);
                
                console.log('💓 Heartbeat sent');
            } catch (error) {
                console.error('❌ Heartbeat error:', error);
            }
        }, 3 * 60 * 1000);
    }

    async function initializeSupabase() {
        try {
            let createClientFn = window.supabase?.createClient;
            
            if (createClientFn && SUPABASE_URL && SUPABASE_ANON_KEY) {
                console.log('🔗 Creating Supabase client...');
                
                await chatbotInstance.cleanup();
                await new Promise(resolve => setTimeout(resolve, 100));
                
                supabaseClient = createClientFn(SUPABASE_URL, SUPABASE_ANON_KEY);
                
                if (chatbotInstance.isInitialized) {
                    console.log('⚠️ Already initialized, skipping subscription setup');
                    return;
                }
                
                console.log('📡 Setting up SINGLE real-time subscription for user:', userId);
                
                const channelName = `live_chat_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                const subscriptionPromise = new Promise((resolve, reject) => {
                    const subscription = supabaseClient
                        .channel(channelName, {
                            config: {
                                broadcast: { self: false },
                                presence: { key: userId }
                            }
                        })
                        .on('postgres_changes', {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'live_chats',
                            filter: `user_id=eq.${userId}`
                        }, (payload) => {
                            
                           if (!chatbotInstance.isInitialized) {
                           console.log('⚠️ Chatbot not initialized, ignoring message');
                           return;
                           }

                           const message = payload.new;
                           const messageId = message.id;
                           const messageContent = message.message;
                           const now = Date.now();

                           if (now - chatbotInstance.lastMessageTime < 2000) {
                               console.log('⏭️ RATE LIMITED: Message too soon, skipping');
                               return;
                           }

                           console.log('🔥 Real-time event for message ID:', messageId);
                           console.log('📝 Message content:', messageContent);

                           if (chatbotInstance.messageSet.has(messageId)) {
                               console.log('⏭️ DUPLICATE DETECTED (ID already processed), skipping');
                               return;
                           } 

                           if (document.querySelector(`[data-msg-id="${messageId}"]`)) {
                               console.log('⏭️ DUPLICATE DETECTED (ID in DOM), skipping');
                               chatbotInstance.messageSet.add(messageId);
                               return;
                           }

                           const recentMessages = Array.from(document.querySelectorAll('.message.received'))
                           .slice(-5)
                           .map(el => el.textContent?.trim().replace(/\s+/g, ' '));

                           const cleanContent = messageContent.trim().replace(/\s+/g, ' ');
                           if (recentMessages.includes(cleanContent)) {
                               console.log('⏭️ DUPLICATE DETECTED (Same content found in recent messages), skipping');
                               console.log('🔍 Duplicate content:', cleanContent);
                               chatbotInstance.messageSet.add(messageId);
                               return;
                           }

                           if (!window.chatbotContentCache) {
                               window.chatbotContentCache = new Set();
                           }

                           const contentKey = `${messageContent}_${message.from_user}_${message.user_id}`;
                            if (window.chatbotContentCache.has(contentKey)) {
                                console.log('⏭️ DUPLICATE DETECTED (Global content cache), skipping');
                                return;
                            }

                            window.chatbotContentCache.add(contentKey);
                            if (window.chatbotContentCache.size > 20) {
                                const firstItem = window.chatbotContentCache.values().next().value;
                                window.chatbotContentCache.delete(firstItem);
                            }
                            
                            if (message.user_id === userId && 
                                message.from_user === 'human' && 
                                isHumanMode) {
                                
                                console.log('✅ DISPLAYING UNIQUE MESSAGE:', message.message);
                                
                                chatbotInstance.messageSet.add(messageId);
                                chatbotInstance.lastMessageTime = now;
                                
                                const messageElement = addMessage(message.message, false, 'human');
                                
                                if (messageElement) {
                                    messageElement.setAttribute('data-msg-id', messageId);
                                    messageElement.setAttribute('data-processed', 'true');
                                }
                            } else {
                                console.log('❌ Message filtered out:', {
                                    userMatch: message.user_id === userId,
                                    isHuman: message.from_user === 'human',
                                    inHumanMode: isHumanMode
                                });
                            }
                        })
                        .subscribe((status, err) => {
                            console.log('📡 Subscription status:', status, 'for:', channelName);
                            if (status === 'SUBSCRIBED') {
                                console.log('🎯 REAL-TIME READY!');
                                chatbotInstance.isInitialized = true;
                                sessionActive = true;
                                startHeartbeat();
                                resolve(subscription);
                            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                                reject(new Error(`Subscription failed: ${status}`));
                            }
                            if (err) {
                                console.error('❌ Subscription error:', err);
                                reject(err);
                            }
                        });
                    
                    setTimeout(() => {
                        if (!chatbotInstance.isInitialized) {
                            reject(new Error('Subscription timeout'));
                        }
                    }, 10000);
                });
                
                try {
                    chatbotInstance.activeSubscription = await subscriptionPromise;
                    console.log('✅ Single real-time setup complete');
                } catch (error) {
                    console.error('❌ Subscription setup failed:', error);
                    chatbotInstance.isInitialized = false;
                }
                
            } else {
                console.log('📱 Running in offline mode');
            }
        } catch (error) {
            console.error('❌ Supabase initialization error:', error);
            chatbotInstance.isInitialized = false;
        }
    }
    
    function showTypingIndicator(fromUser = 'agent') {
        hideTypingIndicator(fromUser);
        
        const typingIndicator = document.createElement('div');
        typingIndicator.id = `typing-indicator-${fromUser}`;
        typingIndicator.className = 'message received typing';
        typingIndicator.innerHTML = `
    <p style="display: flex; align-items: center; gap: 8px;">
        <span>${fromUser === 'agent' ? '👤 Support' : '🤖 AI Assistant'} is typing</span>
        <span class="typing-dots">
            <span></span><span></span><span></span>
        </span>
    </p>
`;
        
        chatMessages.appendChild(typingIndicator);
        window.smoothScrollToBottom(chatMessages);
    }
    
    function hideTypingIndicator(fromUser = 'agent') {
        const indicator = document.getElementById(`typing-indicator-${fromUser}`);
        if (indicator) {
            indicator.remove();
        }
    }
    
    async function storeMessage(message, fromUser, metadata = null) {
        if (!supabaseClient || !userId) return;
        
        try {
            const messageData = {
                user_id: userId,
                from_user: fromUser,
                message: message,
                timestamp: new Date().toISOString(),
                is_active: true
            };
            
            if (metadata) {
                messageData.metadata = metadata;
            }
            
            const { error } = await supabaseClient
                .from('live_chats')
                .insert([messageData]);
            
            if (error) throw error;
        } catch (error) {
            console.error('Error storing message:', error);
        }
    }
    
    function addMessage(message, isUser = false, fromType = 'bot') {
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'sent' : 'received'}`;

        const isImage = typeof message === 'string' && (message.startsWith('http') && /\.(jpg|jpeg|png|gif)$/i.test(message));

        if (isImage) {
            const p = document.createElement('p');
            const img = document.createElement('img');
            img.src = message;
            img.alt = isUser ? "Uploaded by you" : "Image from support";
            img.style.cssText = `max-width: 250px; width: 100%; height: auto; border-radius: 12px; display: block;`;
            p.appendChild(img);
            messageDiv.appendChild(p);
        } else {
            const messageContent = document.createElement('p');
            const formattedMessage = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
            messageContent.innerHTML = formattedMessage;
            messageDiv.appendChild(messageContent);

            if (fromType === 'human') {
                messageContent.style.background = 'linear-gradient(135deg, #059669, #047857)';
                messageContent.style.color = 'white';
                messageContent.style.borderRadius = '15px 15px 15px 0';
                messageDiv.style.justifyContent = 'flex-start';
                const humanIndicator = document.createElement('small');
                humanIndicator.textContent = '👤';
                humanIndicator.style.cssText = 'color: #6b7280; font-size: 0.75rem; margin-bottom: 5px; display: block;';
                messageDiv.insertBefore(humanIndicator, messageContent);
            }
        }

        chatMessages.appendChild(messageDiv);
        window.smoothScrollToBottom(chatMessages);

        if (isUser && supabaseClient && userId) {
            storeMessage(message, 'user');
        }

        if (!isUser && !isImage) {
            announceToScreenReader(`${fromType === 'human' ? 'Human Support' : 'AI Assistant'} says: ${message}`);
        }

        return messageDiv;
    }
    
    const qaTree = {
        welcome: {
            message: "🤖 Hi! I'm here to help you with automation solutions. What would you like to know?",
            buttons: [
                { text: "🤖 I want an automation", action: "automation" },
                { text: "💰 Pricing & Costs", action: "pricing" },
                { text: "⚙️ Technical Support", action: "technical" },
                { text: "ℹ️ General Questions", action: "general" }
            ]
        },

        automation: {
            message: "Great! What type of automation are you looking for?",
            buttons: [
                { text: "📊 Google Sheets Automation", action: "sheets_automation" },
                { text: "🤖 AI Chatbot", action: "ai_chatbot" },
                { text: "🔄 Process Automation", action: "process_automation" },
                { text: "🎯 Custom Solution", action: "custom_solution" },
                { text: "🤔 Not sure what I need", action: "automation_help" }
            ]
        },

        sheets_automation: {
            message: "📊 **Google Sheets Automation** - Transform your spreadsheets into powerful databases!\n\n**What we can automate:**\n• Data sync between apps\n• Automated workflows\n• Custom functions\n• Report generation\n\n**Starting from €100**\n\nWhat specific Sheets task would you like to automate?",
            buttons: [
                { text: "💬 Discuss my needs", action: "connect_human" },
                { text: "📅 Book consultation", action: "book_consultation" },
                { text: "🔙 Back to automation types", action: "automation" }
            ]
        },

        ai_chatbot: {
            message: "🤖 **AI Chatbots** - Perfect for customer support and lead qualification!\n\n**Features:**\n• GPT-powered responses\n• 24/7 availability\n• Custom knowledge base\n• Multi-platform integration\n\n**Starting from €250**\n\nWhat would your chatbot help with?",
            buttons: [
                { text: "💼 Customer support", action: "chatbot_support" },
                { text: "🎯 Lead qualification", action: "chatbot_leads" },
                { text: "📚 Knowledge base", action: "chatbot_knowledge" },
                { text: "💬 Discuss requirements", action: "connect_human" }
            ]
        },

        process_automation: {
            message: "🔄 **Process Automation** - Eliminate manual tasks and boost efficiency!\n\n**Popular automations:**\n• Email workflows\n• Data entry\n• File processing\n• API integrations\n\n**Starting from €100**\n\nWhat process takes up most of your time?",
            buttons: [
                { text: "📧 Email automation", action: "email_automation" },
                { text: "📁 File processing", action: "file_automation" },
                { text: "🔗 App integrations", action: "integration_automation" },
                { text: "💬 Describe my process", action: "connect_human" }
            ]
        },

        custom_solution: {
            message: "🎯 **Custom Solutions** - We build exactly what you need!\n\n**Our process:**\n1. Free consultation & audit\n2. Custom solution design\n3. Build & test (under 7 days)\n4. Deploy & train your team\n\n**Investment: €100-400+ depending on complexity**\n\nReady to discuss your unique requirements?",
            buttons: [
                { text: "📅 Book free audit", action: "book_consultation" },
                { text: "💬 Describe my needs", action: "connect_human" },
                { text: "💰 Get price estimate", action: "pricing_calculator" }
            ]
        },

        automation_help: {
            message: "🤔 **No worries!** Let me help you identify the best automation for your needs.\n\n**Answer this:** What task do you do repeatedly that feels like a waste of time?",
            buttons: [
                { text: "📊 Managing spreadsheets", action: "sheets_automation" },
                { text: "📧 Sending emails", action: "email_automation" },
                { text: "💬 Answering customer questions", action: "ai_chatbot" },
                { text: "📋 Data entry", action: "process_automation" },
                { text: "🤷 Something else", action: "connect_human" }
            ]
        },

        pricing: {
            message: "💰 **Our Pricing Structure:**\n\n🟢 **Simple Syncs:** €100/task\n🟡 **Smart Workflows:** €250/task\n🔴 **Advanced Solutions:** €400/task\n\n**+ Optional:**\n• Google Sheets Dashboard: +€150\n• Custom Dashboard: +€350\n• Monthly Support: €50/month\n\n**All projects delivered in under 7 days!**",
            buttons: [
                { text: "🧮 Calculate my price", action: "pricing_calculator" },
                { text: "❓ What's the difference?", action: "pricing_explained" },
                { text: "📅 Get custom quote", action: "book_consultation" },
                { text: "💬 Discuss pricing", action: "connect_human" }
            ]
        },

        pricing_explained: {
            message: "📋 **Pricing Breakdown:**\n\n🟢 **Simple Syncs (€100):**\nBasic data transfer between two apps\n*Example: Gmail → Google Sheets*\n\n🟡 **Smart Workflows (€250):**\nInvolves AI, conditions, or data processing\n*Example: AI email categorization*\n\n🔴 **Advanced Solutions (€400):**\nWeb scraping, custom APIs, complex logic\n*Example: Automated lead generation*",
            buttons: [
                { text: "🧮 Calculate my project", action: "pricing_calculator" },
                { text: "💬 Discuss my needs", action: "connect_human" },
                { text: "🔙 Back to pricing", action: "pricing" }
            ]
        },

        technical: {
            message: "⚙️ **Technical Support** - How can I help you?",
            buttons: [
                { text: "🔧 My automation isn't working", action: "automation_broken" },
                { text: "📝 I need help with setup", action: "setup_help" },
                { text: "🔄 Request modifications", action: "modification_request" },
                { text: "📚 Documentation/Training", action: "documentation" },
                { text: "🆘 Emergency support", action: "emergency_support" }
            ]
        },

        automation_broken: {
            message: "🔧 **Automation Issue** - I'll connect you with our technical team immediately.\n\n**Please prepare:**\n• Description of the problem\n• When it started happening\n• Any error messages\n• Screenshots if possible\n\n**Our support team typically responds within 2 hours.**",
            buttons: [
                { text: "💬 Report the issue", action: "connect_human" },
                { text: "📧 Email support", action: "email_support" },
                { text: "🔙 Back to technical", action: "technical" }
            ]
        },

        setup_help: {
            message: "📝 **Setup Assistance** - Need help getting your automation running?\n\n**We provide:**\n• Step-by-step guidance\n• Screen sharing sessions\n• Complete setup service\n• Team training\n\n**Most setups take 15-30 minutes with our help.**",
            buttons: [
                { text: "💬 Get setup help", action: "connect_human" },
                { text: "📅 Schedule setup call", action: "book_consultation" },
                { text: "📚 View documentation", action: "documentation" }
            ]
        },

        general: {
            message: "ℹ️ **General Questions** - What would you like to know?",
            buttons: [
                { text: "🏢 About AutoFlow Studio", action: "about_company" },
                { text: "⏰ How long does it take?", action: "timeline" },
                { text: "🛡️ Security & Privacy", action: "security" },
                { text: "🎯 Success stories", action: "case_studies" },
                { text: "🤝 How we work", action: "process" }
            ]
        },

        about_company: {
            message: "🏢 **About AutoFlow Studio**\n\nWe're automation specialists who help startups and growing businesses eliminate manual work.\n\n**Founded on the belief that:**\n• Technology should work FOR you\n• Time is your most valuable asset\n• Every business deserves custom solutions\n\n**We've automated 1000+ hours of work for our clients!**",
            buttons: [
                { text: "🎯 See our work", action: "case_studies" },
                { text: "💬 Start a project", action: "automation" },
                { text: "🔙 Back to general", action: "general" }
            ]
        },

        timeline: {
            message: "⏰ **Project Timeline:**\n\n**Day 1-2:** Requirements & design\n**Day 3-5:** Build & test\n**Day 6-7:** Deploy & train\n\n**Most projects delivered in under 7 days!**\n\n**Rush jobs available for urgent needs.**",
            buttons: [
                { text: "📅 Start my project", action: "book_consultation" },
                { text: "🚨 I need it urgently", action: "connect_human" },
                { text: "🔙 Back to general", action: "general" }
            ]
        },

        email_automation: {
            message: "📧 **Email Automation** - Stop spending hours on email!\n\n**Popular solutions:**\n• Auto-respond to inquiries\n• Lead nurturing sequences\n• Follow-up reminders\n• Email sorting & filing\n\n**Starting from €150**",
            buttons: [
                { text: "💬 Discuss my email needs", action: "connect_human" },
                { text: "📅 Book consultation", action: "book_consultation" },
                { text: "🔙 Back to automations", action: "automation" }
            ]
        },

        chatbot_support: {
            message: "💼 **Customer Support Chatbot**\n\n**Perfect for:**\n• 24/7 customer service\n• FAQ automation\n• Ticket routing\n• Order status updates\n\n**Features:**\n✅ Instant responses\n✅ Human handoff\n✅ Multiple platforms\n✅ Analytics dashboard",
            buttons: [
                { text: "💬 Plan my support bot", action: "connect_human" },
                { text: "📅 Book consultation", action: "book_consultation" },
                { text: "🔙 Back to chatbots", action: "ai_chatbot" }
            ]
        },

        connect_human: {
            message: "🤝 **Connecting you with our team...**\n\nA human expert will respond shortly. You can continue typing here and they'll see your messages.\n\n**Average response time: 15 minutes**",
            action: "human_handoff"
        },

        book_consultation: {
            message: "📅 **Ready to book your free consultation?**\n\nClick the button below to choose a time that works for you. Our automation experts will:\n\n✅ Audit your current processes\n✅ Identify automation opportunities  \n✅ Provide a custom solution plan\n✅ Give you an accurate quote\n\n**100% free, no commitment required!**",
            buttons: [
                { text: "📅 Book Free Consultation", action: "external_calendar" },
                { text: "💬 Ask questions first", action: "connect_human" }
            ]
        },

        pricing_calculator: {
            message: "🧮 **Price Calculator**\n\nUse our interactive calculator to get an instant estimate for your automation project.\n\n**Takes just 2 minutes!**",
            buttons: [
                { text: "🧮 Open Calculator", action: "open_calculator" },
                { text: "💬 Get custom quote", action: "connect_human" }
            ]
        },

        case_studies: {
            message: "🎯 **Success Stories**\n\n**Food Platform:** Saved 20 hours/week with photo automation\n**Sales Team:** 10X outreach volume with AI emails  \n**Support Team:** 70% of inquiries automated\n**Data Team:** 5-7X faster lead generation\n\n**Ready to see similar results?**",
            buttons: [
                { text: "📅 Start my project", action: "book_consultation" },
                { text: "💬 Discuss my goals", action: "connect_human" },
                { text: "🔙 Back to general", action: "general" }
            ]
        }
    };
    
    function addButtons(buttons, currentStep = null) {
        if (!chatMessages || !buttons) return;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'chat-buttons';
        buttonContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin: 10px 0;
            max-width: 80%;
        `;
        
        buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.textContent = button.text;
            btn.style.cssText = `
                background: #f1f5f9;
                border: 2px solid #e5e7eb;
                border-radius: 20px;
                padding: 8px 16px;
                color: #374151;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.9rem;
                text-align: left;
            `;
            
            btn.addEventListener('mouseenter', () => {
                btn.style.background = '#e91e63';
                btn.style.color = 'white';
                btn.style.borderColor = '#e91e63';
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.background = '#f1f5f9';
                btn.style.color = '#374151';
                btn.style.borderColor = '#e5e7eb';
            });
            
            btn.addEventListener('click', () => {
                handleButtonClick(button.action, button.text);
                buttonContainer.remove();
            });
            
            buttonContainer.appendChild(btn);
        });
        
        if (currentStep !== 'welcome' && currentStep !== null) {
            const backBtn = document.createElement('button');
            backBtn.textContent = "🔙 Go Back";
            backBtn.style.cssText = `
                background: #f8fafc;
                border: 2px solid #cbd5e1;
                border-radius: 20px;
                padding: 8px 16px;
                color: #64748b;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.9rem;
                margin-top: 5px;
            `;
            
            backBtn.addEventListener('mouseenter', () => {
                backBtn.style.background = '#64748b';
                backBtn.style.color = 'white';
                backBtn.style.borderColor = '#64748b';
            });
            
            backBtn.addEventListener('mouseleave', () => {
                backBtn.style.background = '#f8fafc';
                backBtn.style.color = '#64748b';
                backBtn.style.borderColor = '#cbd5e1';
            });
            
            backBtn.addEventListener('click', () => {
                handleButtonClick('welcome', '🔙 Go Back');
                buttonContainer.remove();
            });
            
            buttonContainer.appendChild(backBtn);
        }
        
        const humanBtn = document.createElement('button');
        humanBtn.textContent = "👤 Talk to a human";
        humanBtn.style.cssText = `
            background: linear-gradient(135deg, #e91e63, #9c27b0);
            border: none;
            border-radius: 20px;
            padding: 8px 16px;
            color: white;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.9rem;
            margin-top: 5px;
        `;
        
        humanBtn.addEventListener('click', () => {
            handleHumanRequest();
            buttonContainer.remove();
        });
        
        buttonContainer.appendChild(humanBtn);
        chatMessages.appendChild(buttonContainer);
        window.smoothScrollToBottom(chatMessages);
        console.log('✅ Enhanced chatbot initialization complete');
        
        window.tryAIResponse = tryAIResponse;
        window.callAIEndpoint = callAIEndpoint;
        
        initializeUserId();
        initializeSupabase();
    }

    function handleButtonClick(action, buttonText) {
        addMessage(buttonText, true);
        showTypingIndicator('bot');
        
        setTimeout(() => {
            hideTypingIndicator('bot');
            
            if (action === 'human_handoff' || action === 'connect_human') {
                handleHumanRequest();
                return;
            }
            
            if (action === 'external_calendar') {
                addMessage("📅 **Opening calendar...**\n\nRedirecting you to book your free consultation!");
                setTimeout(() => {
                    window.open('https://calendar.app.google/bnsr9k5VHi5EYgdM8', '_blank');
                    showCompletionMessage();
                }, 2000);
                return;
            }
            
            if (action === 'open_calculator') {
                addMessage("🧮 **Opening price calculator...**\n\nUse this tool to get an instant estimate!");
                setTimeout(() => {
                    hideModal('chatbot-modal-overlay');
                    showModal('calculator-modal-overlay');
                }, 1000);
                return;
            }
            
            if (action === 'email_support') {
                addMessage("📧 **Email Support**\n\nFor technical issues, email us at: **info@autoflowstudio.net**\n\nWe typically respond within 4 hours.");
                setTimeout(() => showCompletionMessage(), 1000);
                return;
            }
            
            const response = qaTree[action];
            if (response) {
                addMessage(response.message);
                
                if (response.buttons) {
                    setTimeout(() => addButtons(response.buttons, action), 500);
                } else {
                    setTimeout(() => showCompletionMessage(), 1000);
                }
                
                if (response.action === 'human_handoff') {
                    setTimeout(() => handleHumanRequest(), 1000);
                }
            } else {
                addMessage("I'm not sure about that. Let me connect you with our team who can help!");
                setTimeout(() => handleHumanRequest(), 1000);
            }
            
        }, 1000 + Math.random() * 1000);
    }

    function showCompletionMessage() {
        setTimeout(() => {
            showTypingIndicator('bot');
            
            setTimeout(() => {
                hideTypingIndicator('bot');
                addMessage("✨ **Do you have anything else in mind?**\n\nI'm here to help with any other automation questions!");
                
                setTimeout(() => addButtons([
                    { text: "🤖 Explore automations", action: "automation" },
                    { text: "💰 Check pricing", action: "pricing" },
                    { text: "ℹ️ General questions", action: "general" },
                    { text: "🏠 Back to main menu", action: "welcome" }
                ], 'completion'), 500);
            }, 800);
        }, 1500);
    }
    
    async function handleHumanRequest() {
        addMessage("👤 Talk to a human", true);
        showTypingIndicator('bot');
        
        setTimeout(async () => {
            hideTypingIndicator('bot');
            
            isHumanMode = true;
            console.log('🤝 Entering human mode for user:', userId);
            
            addMessage("🤝 **Connecting you with our team...**\n\nA human support agent will respond shortly. You can continue typing here and they'll see your messages.");
            
            await sendToTelegram(`🔔 **New Support Request**\n\nUser ID: ${userId}\nRequesting human support.\n\nRespond with: /reply ${userId} your message`);
            
            console.log('📢 Telegram notification sent');
            console.log('🔍 Watching for real-time messages...');
            
        }, 1000);
    }
    
    async function sendToTelegram(message) {
        const TELEGRAM_BOT_TOKEN = window.AUTOFLOW_CONFIG?.TELEGRAM_CONFIG?.BOT_TOKEN;
        const TELEGRAM_CHAT_ID = window.AUTOFLOW_CONFIG?.TELEGRAM_CONFIG?.SUPPORT_CHAT_ID;
        
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            console.log('Telegram not configured - human request logged locally');
            return;
        }
        
        try {
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send to Telegram');
            }
        } catch (error) {
            console.error('Error sending to Telegram:', error);
        }
    }
    
    function sendMessage() {
        if (!chatInput) return;
        
        const message = chatInput.value.trim();
        if (!message) return;
        
        if (isUserTyping) {
            isUserTyping = false;
            clearTimeout(typingTimeout);
        }
        
        addMessage(message, true);
        chatInput.value = '';
        
        if (isHumanMode) {
            sendToTelegram(`💬 **User Message**\n\nUser ID: ${userId}\nMessage: ${message}\n\nRespond with: /reply ${userId} your message`);
            return;
        }
        
        showTypingIndicator('bot');
        
        setTimeout(() => {
            hideTypingIndicator('bot');
            
            const lowerMessage = message.toLowerCase();
            
            if (lowerMessage.includes('human') || lowerMessage.includes('agent') || lowerMessage.includes('support')) {
                handleHumanRequest();
            } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
                addMessage("💰 Our automations start from €100. Use the pricing calculator for an instant estimate!");
                setTimeout(() => addButtons([
                    { text: "🧮 Open Calculator", action: "open_calculator" },
                    { text: "💬 Discuss pricing", action: "connect_human" },
                    { text: "📅 Get custom quote", action: "book_consultation" }
                ], 'pricing'), 500);
            } else if (lowerMessage.includes('automation')) {
                addMessage("🤖 Great! What would you like to automate?");
                setTimeout(() => addButtons(qaTree.automation.buttons, 'automation'), 500);
            } else if (lowerMessage.includes('sheet') || lowerMessage.includes('excel')) {
                addMessage("📊 Google Sheets automation can transform your spreadsheets! What would you like to automate?");
                setTimeout(() => addButtons(qaTree.sheets_automation.buttons, 'sheets_automation'), 500);
            } else if (lowerMessage.includes('email') || lowerMessage.includes('mail')) {
                addMessage("📧 Email automation saves tons of time! What email tasks do you want to automate?");
                setTimeout(() => addButtons(qaTree.email_automation.buttons, 'email_automation'), 500);
            } else if (lowerMessage.includes('chatbot') || lowerMessage.includes('bot')) {
                addMessage("🤖 AI chatbots are perfect for customer support! What would your chatbot help with?");
                setTimeout(() => addButtons(qaTree.ai_chatbot.buttons, 'ai_chatbot'), 500);
            } else if (lowerMessage.includes('how long') || lowerMessage.includes('timeline') || lowerMessage.includes('when')) {
                addMessage("⏰ Most projects are delivered in under 7 days! Here's our typical timeline:");
                setTimeout(() => addButtons(qaTree.timeline.buttons, 'timeline'), 500);
            } else if (lowerMessage.includes('book') || lowerMessage.includes('schedule') || lowerMessage.includes('appointment')) {
                addMessage("📅 Ready to get started? Let's book your free consultation:");
                setTimeout(() => addButtons(qaTree.book_consultation.buttons, 'book_consultation'), 500);
            } else {
                console.log('🧠 No keyword match, trying AI for:', message);
                tryAIResponse(message);
            }
        }, 1500);
    }
    
    async function tryAIResponse(userMessage) {
        console.log('🧠 Attempting AI response for:', userMessage);
        
        try {
            const aiResponse = await callAIEndpoint(userMessage);
            
            if (aiResponse && aiResponse.trim()) {
                console.log('✅ AI responded successfully');
                addMessage(`🤖 ${aiResponse}`);
                
                setTimeout(() => addButtons([
                    { text: "💬 Talk to a human", action: "connect_human" },
                    { text: "🤖 Explore automations", action: "automation" },
                    { text: "💰 Check pricing", action: "pricing" },
                    { text: "🏠 Main menu", action: "welcome" }
                ], 'ai_response'), 500);
                
            } else {
                throw new Error('Empty AI response');
            }
            
        } catch (error) {
            console.log('⚠️ AI failed, using default response:', error.message);
            
            addMessage("Thanks for your message! I can help you with automation questions. Here are some topics I can assist with:");
            setTimeout(() => addButtons(qaTree.welcome.buttons, 'welcome'), 1500);
        }
    }

    async function callAIEndpoint(message) {
        const userId = localStorage.getItem('chatbot_user_id') || 'web_user_' + Date.now();
        const endpoint = 'https://gngpakwohqumvkalnykf.supabase.co/functions/v1/telegram-webhook?ai=true';
        
        console.log('📡 Calling AI with simple format:', message);
        
        const payload = {
            message: message,
            userId: userId
        };
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        const responseText = await response.text();
        console.log('📥 Response:', responseText);
        
        if (!response.ok) {
            throw new Error(`AI failed: ${response.status} - ${responseText}`);
        }
        
        const data = JSON.parse(responseText);
        console.log('✅ AI success:', data);
        
        return data.response || null;
    }

    function initializeChat() {
        if (!chatMessages) return;
        
        chatMessages.innerHTML = '';
        isHumanMode = false;
        currentStep = 'welcome';
        isUserTyping = false;
        
        setTimeout(() => {
            addMessage(qaTree.welcome.message);
            setTimeout(() => addButtons(qaTree.welcome.buttons), 500);
        }, 500);
    }
    
    if (chatInput) {
        chatInput.addEventListener('input', () => {
            if (!isUserTyping && chatInput.value.length > 0) {
                isUserTyping = true;
            }
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                if (isUserTyping) {
                    isUserTyping = false;
                }
            }, 2000);
        });
        
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', sendMessage);
    }
    
    if (closeChatbotBtn) {
        closeChatbotBtn.addEventListener('click', () => {
            hideModal('chatbot-modal-overlay');
        });
    }
    
    const chatUploadBtn = document.getElementById('chat-upload-btn');
    if (chatUploadBtn) {
        chatUploadBtn.addEventListener('click', () => {
            handleFileUpload();
        });
    }

    function handleFileUpload() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleSelectedFile(file);
            }
            document.body.removeChild(fileInput);
        });
        
        document.body.appendChild(fileInput);
        fileInput.click();
    }

    async function handleSelectedFile(file) {
        console.log('📎 File selected:', file.name);

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('File too large. Maximum size is 10MB.');
            return;
        }

        addMessage(`📎 Uploading ${file.name}...`, true);
        showTypingIndicator('bot');

        try {
            const formData = new FormData();
            formData.append('file', file);
            const chatId = window.AUTOFLOW_CONFIG?.TELEGRAM_CONFIG?.SUPPORT_CHAT_ID;
            if (!chatId) throw new Error("Telegram support chat ID is not configured.");
            formData.append('chatId', chatId);

            const edgeFunctionUrl = 'https://gngpakwohqumvkalnykf.supabase.co/functions/v1/telegram-webhook/send-image-to-telegram';

            const response = await fetch(edgeFunctionUrl, {
                method: 'POST',
                body: formData,
            });

            hideTypingIndicator('bot');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed.');
            }

            const result = await response.json();
            console.log('File upload successful, URL:', result.url);

            const messages = document.querySelectorAll('.message.sent');
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.textContent.startsWith('📎 Uploading')) {
                lastMessage.remove();
            }

            addMessage(result.url, true);

        } catch (error) {
            hideTypingIndicator('bot');
            console.error('❌ File upload error:', error);
            addMessage(`❌ **Error:** Could not send the file. Please try again or contact support.`);
        }
    }
    
    console.log('📎 File upload functionality added to chatbot');
    
    if (chatbotModalOverlay) {
        chatbotModalOverlay.addEventListener('click', (e) => {
            if (e.target === chatbotModalOverlay) hideModal('chatbot-modal-overlay');
        });
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    if (chatbotModalOverlay.classList.contains('visible')) {
                        sessionActive = true;
                        if(chatMessages) window.smoothScrollToBottom(chatMessages);
                    } else {
                        sessionActive = false;
                    }
                }
            });
        });
        observer.observe(chatbotModalOverlay, { attributes: true });
    }
    
    (async () => {
        console.log('✅ Enhanced chatbot initialization complete, starting setup...');
        initializeUserId();
        await initializeSupabase();
        initializeChat();
    })();
}

/**
 * WORKING VIDEO CONTROLS - Single clean system
 */
// ADD THIS TO YOUR initializeVideoControls() FUNCTION IN tools.js
// Replace the existing video setup with this aggressive version

// REPLACE your initializeVideoControls() function with this:

// REPLACE your initializeVideoControls() function with this simpler version:

function initializeVideoControls() {
    console.log('🎬 Simple video controls - letting carousel handle it');
    
    // Just set up the global stop function
    window.stopAllVideos = function() {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            if (!video.paused) {
                video.pause();
            }
            const wrapper = video.closest('.video-wrapper');
            if (wrapper) {
                wrapper.classList.remove('playing');
                wrapper.classList.add('paused');
            }
        });
    };
    
    console.log('✅ Video controls: Delegated to carousel system');
}
/**
 * Modal functions
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('visible');
        
        const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 100);
        }
        
        trapFocus(modal);
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('visible');
        document.body.style.overflow = '';
        
        const mainFab = document.getElementById('main-fab');
        if (mainFab) {
            mainFab.focus();
        }
    }
}

function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    function handleTabKey(e) {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        } else if (e.key === 'Escape') {
            const modalOverlay = element.closest('.calculator-modal-overlay');
            if (modalOverlay) {
                hideModal(modalOverlay.id);
            }
        }
    }
    
    element.addEventListener('keydown', handleTabKey);
    element._trapFocusHandler = handleTabKey;
}

function announceToScreenReader(message) {
    let liveRegion = document.getElementById('tools-live-region');
    
    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'tools-live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        document.body.appendChild(liveRegion);
    }
    
    liveRegion.textContent = message;
}

/**
 * Debug functions
 */
function testRealtimeConnection() {
    console.log('🧪 Testing real-time connection...');
    const storedUserId = localStorage.getItem('chatbot_user_id');
    console.log('📍 Current state:');
    console.log('   - Stored User ID:', storedUserId);
    console.log('   - Supabase available:', typeof window.supabase !== 'undefined');
    console.log('   - Config available:', !!window.AUTOFLOW_CONFIG);
    console.log('   - Chatbot instance exists:', !!window.AUTOFLOW_CHATBOT_INSTANCE);
    console.log('   - Instance initialized:', window.AUTOFLOW_CHATBOT_INSTANCE?.isInitialized);
    console.log('   - Active subscription:', !!window.AUTOFLOW_CHATBOT_INSTANCE?.activeSubscription);
    console.log('   - Messages in set:', window.AUTOFLOW_CHATBOT_INSTANCE?.messageSet?.size || 0);
}

function forceCleanupChatbot() {
    console.log('🧨 FORCE CLEANUP: Destroying everything...');
    
    if (window.AUTOFLOW_CHATBOT_INSTANCE) {
        window.AUTOFLOW_CHATBOT_INSTANCE.cleanup();
        delete window.AUTOFLOW_CHATBOT_INSTANCE;
    }
    
    if (window.displayedMessages) {
        window.displayedMessages.clear();
        delete window.displayedMessages;
    }
    
    if (window.supabase) {
        try {
            const tempClient = window.supabase.createClient(
                window.AUTOFLOW_CONFIG?.SUPABASE_CONFIG?.SUPABASE_URL,
                window.AUTOFLOW_CONFIG?.SUPABASE_CONFIG?.SUPABASE_ANON_KEY
            );
            tempClient.removeAllChannels();
        } catch (e) {
            console.log('Channel cleanup error:', e);
        }
    }
    
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
        console.log('🧹 Cleared chat messages from DOM');
    }
    
    console.log('💥 FORCE CLEANUP COMPLETE - Try opening chatbot again');
}

function debugChatState() {
    console.log('🔍 CHAT DEBUG STATE:');
    
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
        const messages = chatMessages.querySelectorAll('[data-msg-id]');
        console.log('📨 Messages in DOM:', messages.length);
        
        messages.forEach((msg, i) => {
            const msgId = msg.getAttribute('data-msg-id');
            const isProcessed = msg.getAttribute('data-processed');
            console.log(`  ${i + 1}. ID: ${msgId}, Processed: ${isProcessed}`);
        });
    }
    
    console.log('💾 Message IDs in memory:', Array.from(window.AUTOFLOW_CHATBOT_INSTANCE?.messageSet || []));
    console.log('⏰ Last message time:', new Date(window.AUTOFLOW_CHATBOT_INSTANCE?.lastMessageTime || 0));
}

/**
 * Export controls
 */
window.testRealtimeConnection = testRealtimeConnection;
window.forceCleanupChatbot = forceCleanupChatbot;
window.debugChatState = debugChatState;

window.ToolsControls = {
    showCalculator: () => showModal('calculator-modal-overlay'),
    showChatbot: () => showModal('chatbot-modal-overlay'),
    hideCalculator: () => hideModal('calculator-modal-overlay'),
    hideChatbot: () => hideModal('chatbot-modal-overlay')
};

console.log('✅ AutoFlow Studio Tools loaded - All functions working');
console.log('🎬 Video controls: Clean and working');
console.log('💬 Chatbot: Full functionality preserved');
console.log('🧮 Calculator: Working');
console.log('🔧 FAB Tools: Working');
