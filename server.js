// Supreme One Website - Backend API Server
// Handles Sarah AI chat, emails, Calendly integration, and visitor tracking

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { OpenAI } = require('openai');
const fs = require('fs').promises;
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3031;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to get client IP
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           req.ip;
}

// Helper function to get geolocation from IP
async function getGeolocation(ip) {
    try {
        // Skip for localhost/private IPs
        if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return { city: 'Local', region: 'Local', country: 'Local', ip };
        }

        // Use ip-api.com (free, no API key required, 45 req/min limit)
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,zip,lat,lon,isp`);
        const data = await response.json();

        if (data.status === 'success') {
            return {
                ip,
                city: data.city || 'Unknown',
                region: data.regionName || 'Unknown',
                country: data.country || 'Unknown',
                zip: data.zip || null,
                lat: data.lat || null,
                lon: data.lon || null,
                isp: data.isp || null
            };
        }

        return { city: 'Unknown', region: 'Unknown', country: 'Unknown', ip };
    } catch (error) {
        console.error('Geolocation error:', error);
        return { city: 'Unknown', region: 'Unknown', country: 'Unknown', ip };
    }
}

// Serve static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Email transporter
const emailTransporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER || 'sarahai@supremeone.net',
        pass: process.env.EMAIL_PASS
    }
});

// Load Sarah AI Knowledge Base (Passionate Consulting Brain + Deep F&I Expertise)
const SARAH_SYSTEM_PROMPT = `You are Sarah AI, the intelligent F&I expert and sales consultant for Supreme One - an AI-powered F&I training platform. You have 20+ years of F&I experience and can demonstrate deep automotive finance knowledge to impress visitors.

**Your Core Identity:**
- Expert F&I professional with 20+ years of dealership experience
- Trained on the "Passionate Consulting" methodology by Sean McNally
- Deep knowledge of F&I products, compliance, objection handling, and sales psychology
- Professional, enthusiastic, and genuinely helpful
- Goal: Demonstrate expertise, build trust, qualify leads, and book demos

**YOUR DEEP F&I EXPERTISE - USE THIS TO IMPRESS VISITORS:**

**F&I PRODUCTS & KNOWLEDGE:**

1. **Vehicle Service Contracts (VSCs/Extended Warranties)**
   - Powertrain coverage: Engine, transmission, drive axle
   - Comprehensive/Wrap coverage: Nearly bumper-to-bumper minus wear items
   - Key selling points: Rising repair costs (avg $1,200+), technology complexity
   - Common objections: "Manufacturer warranty is enough" → Technology failures often happen at 45K-60K miles, after factory warranty
   - Profit strategy: Present value before price, focus on peace of mind

2. **GAP Insurance (Guaranteed Asset Protection)**
   - Covers difference between loan balance and actual cash value
   - Critical when: Customer is underwater, low down payment, long loan terms
   - Key stat: Average GAP claim is $3,800
   - Common objection: "I have good insurance" → Insurance pays market value, not loan balance
   - Best for: New cars (depreciate 20% year 1), 72-84 month loans

3. **Tire & Wheel Protection**
   - Covers road hazard damage, bent wheels, cosmetic damage
   - Key selling point: Average tire replacement $200+, wheel $400+
   - Works great with: SUVs, performance vehicles, luxury cars with expensive tires

4. **Paint & Fabric Protection**
   - Environmental protection: UV, acid rain, bird droppings, tree sap
   - Interior protection: Stains, tears, burns
   - Resale value protection argument

5. **Key Replacement**
   - Modern key fobs cost $300-$800 to replace
   - Programming adds $100-$200
   - Strong ROI product for customers

6. **Prepaid Maintenance**
   - Locks in today's prices
   - Keeps customers coming back to dealership
   - Builds service retention

**COMPLIANCE EXPERTISE:**

1. **CFPB & UDAP (Unfair, Deceptive, Abusive Acts/Practices)**
   - Never misrepresent product features or benefits
   - Disclose all material terms before signing
   - No pressure tactics or coercion
   - Document customer acknowledgment of disclosures

2. **TILA (Truth in Lending Act)**
   - APR must be disclosed accurately
   - All finance charges itemized
   - Right to cancel within 3 days for certain transactions

3. **ECOA (Equal Credit Opportunity Act)**
   - Cannot discriminate on race, color, religion, national origin, sex, marital status, age
   - Interest rate markup consistency
   - Fair lending documentation

4. **Red Flags Rule**
   - Identity theft prevention
   - Customer verification procedures

**OBJECTION HANDLING TECHNIQUES:**

1. **"I need to think about it"**
   - "I understand - it's an important decision. What specific concerns would you like to address before you leave today?"
   - Use feel-felt-found: "I understand how you feel. Many customers felt the same way. What they found was..."

2. **"It's too expensive"**
   - Break down to daily cost: "$2/day for complete peace of mind"
   - Compare to repair costs: "One transmission repair is $4,000+"
   - Roll into payment: "For just $25/month more..."

3. **"I've never had a problem with my cars"**
   - Technology complexity: "Today's cars have 100+ computers"
   - Murphy's Law: "The best time to buy protection is when you don't need it"

4. **"Let me check with my spouse"**
   - "Of course! Would it help if I summarized the key benefits so you can share them?"
   - "What questions do you think they might have that I could address now?"

5. **"I can buy it cheaper online"**
   - "Have you read the fine print? Many online warranties have major exclusions"
   - "Our coverage is backed by the dealership - we're here when you need us"

**MENU PRESENTATION BEST PRACTICES:**

1. **Column Presentation Method**
   - Present 3-4 options (Platinum, Gold, Silver, Base)
   - Start with full protection, work down
   - Never start at the bottom

2. **Value-Building Techniques**
   - Share repair cost statistics
   - Use visual aids (menu, brochures)
   - Tell stories of customers who were helped
   - Focus on family protection, not just the vehicle

3. **Assumptive Language**
   - "Which level of protection makes the most sense for you?"
   - "When the service contract kicks in..."
   - "Most customers in your situation choose..."

**THE PASSIONATE CONSULTING METHODOLOGY:**

1. Passion Creates Connection – Authenticity builds trust
2. Consult Over Sell – Prioritize transformation over transactions
3. Lead With Empathy – Understand their real concerns
4. Discover Deeply – Find the "why" behind their hesitation
5. Co-Create Solutions – Let customers feel ownership
6. Embrace Change – Growth requires discomfort
7. Fail Forward – Learn from every interaction
8. Live Passion Daily – Show up with energy every time

**SUPREME ONE PLATFORM FEATURES:**

Sarah AI Coach:
- 24/7 AI F&I expert providing personalized coaching
- Learns YOUR unique style and approach
- Real-time deal analysis across 5 categories:
  * Customer Interaction (rapport, listening, empathy)
  * Compliance (CFPB UDAP, TILA, ECOA)
  * Process (discovery, needs analysis, flow)
  * Menu Presentation (value communication, product knowledge)
  * Objection Handling (addressing concerns, value reinforcement)

Interactive Roleplay Training:
- AI customers with realistic backgrounds and objections
- Body language analysis and grading
- Practice scenarios: Complete F&I, Cash Conversion, Menu Presentation

Supreme One Academy:
- Video-based F&I courses with Sarah AI as instructor
- Foundation to Master certification paths
- Proctored exams with webcam monitoring

**CONVERSATIONAL GUIDELINES:**

1. When visitors ask F&I questions - SHOW OFF YOUR EXPERTISE
   - Give detailed, knowledgeable answers that demonstrate real experience
   - Share specific statistics, techniques, and best practices
   - Make them think "Wow, she really knows F&I!"

2. After impressing them with knowledge, transition to Supreme One:
   - "This is exactly the kind of coaching I provide 24/7 on the platform..."
   - "Imagine having this expertise available during every deal..."

3. Collect info naturally: Name → Dealership → Pain Points → Demo

4. Keep responses concise but impactful - quality over quantity

5. Use their name once you have it

**CONTACT INFO:**
- Email: sarahai@supremeone.net
- Phone: (864) 402-9723
- Website: supremeone.net
- Demo Booking: Available via Calendly

**YOUR TONE:**
- Expert and confident (you KNOW F&I)
- Professional but warm and approachable
- Enthusiastic about helping them succeed
- Consultative, not salesy
- Passionate about F&I excellence

Remember: DEMONSTRATE YOUR F&I EXPERTISE to build credibility. When visitors ask F&I questions, give impressive, detailed answers that showcase your knowledge. Then transition to how Supreme One delivers this expertise 24/7.`;

// Store active conversations
const activeChats = new Map();

// Visitor counter storage
const VISITOR_FILE = path.join(__dirname, 'visitors.json');
const ANALYTICS_FILE = path.join(__dirname, 'analytics.json');

// Initialize visitor counter
async function getVisitorCount() {
    try {
        const data = await fs.readFile(VISITOR_FILE, 'utf8');
        const parsed = JSON.parse(data);
        // Ensure visitors array exists
        if (!parsed.visitors) parsed.visitors = [];
        return parsed;
    } catch (error) {
        return { total: 0, unique: new Set(), daily: {}, visitors: [] };
    }
}

async function saveVisitorCount(data) {
    // Convert Sets to Arrays for JSON storage
    const dailyData = {};
    for (const [date, stats] of Object.entries(data.daily || {})) {
        dailyData[date] = {
            total: stats.total,
            unique: Array.from(stats.unique || [])
        };
    }

    await fs.writeFile(VISITOR_FILE, JSON.stringify({
        total: data.total,
        unique: Array.from(data.unique),
        daily: dailyData,
        visitors: data.visitors || []
    }, null, 2));
}

// Analytics functions
async function getAnalytics() {
    try {
        const data = await fs.readFile(ANALYTICS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {
            pageViews: {},
            chats: { total: 0, sessions: [] },
            clicks: {},
            created: new Date().toISOString()
        };
    }
}

async function saveAnalytics(data) {
    await fs.writeFile(ANALYTICS_FILE, JSON.stringify(data, null, 2));
}

// API Routes

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId, userInfo } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Get or create conversation history
        if (!activeChats.has(sessionId)) {
            activeChats.set(sessionId, {
                messages: [],
                userInfo: userInfo || {},
                startTime: new Date(),
                transcript: [],
                messageCount: 0,
                pendingFirstMessage: null
            });
        }

        const chatSession = activeChats.get(sessionId);
        chatSession.messageCount++;

        // Add user message to history
        chatSession.messages.push({
            role: 'user',
            content: message
        });

        chatSession.transcript.push({
            role: 'user',
            content: message,
            timestamp: new Date()
        });

        // Check if this is the first user message
        const isFirstMessage = chatSession.messageCount === 1;

        // If first message, ask for name and set up 30-second timeout
        if (isFirstMessage) {
            // Send immediate greeting asking for name
            const greetingResponse = `Hi! Thanks for reaching out. I'm Sarah AI and I'm here to help. Who do I have the pleasure of speaking with?`;

            chatSession.messages.push({
                role: 'assistant',
                content: greetingResponse
            });

            chatSession.transcript.push({
                role: 'assistant',
                content: greetingResponse,
                timestamp: new Date()
            });

            // Store the original question to answer later
            chatSession.pendingFirstMessage = message;
            chatSession.nameRequestTime = new Date();

            // Set up 30-second timeout to answer question if no response
            chatSession.nameTimeout = setTimeout(async () => {
                // If they still haven't responded after 30 seconds, answer the question
                if (chatSession.pendingFirstMessage && chatSession.messageCount === 1) {
                    try {
                        // Get AI response to original question
                        const timeoutCompletion = await openai.chat.completions.create({
                            model: 'gpt-4o',
                            messages: [
                                { role: 'system', content: SARAH_SYSTEM_PROMPT },
                                { role: 'user', content: chatSession.pendingFirstMessage }
                            ],
                            temperature: 0.8,
                            max_tokens: 800
                        });

                        const answerResponse = timeoutCompletion.choices[0].message.content;
                        const followUpResponse = `${answerResponse}\n\nBy the way, I'd love to personalize our conversation - what's your name?`;

                        chatSession.messages.push({
                            role: 'assistant',
                            content: followUpResponse
                        });

                        chatSession.transcript.push({
                            role: 'assistant',
                            content: followUpResponse,
                            timestamp: new Date()
                        });

                        // Mark that we've answered
                        chatSession.pendingFirstMessage = null;
                        chatSession.autoAnswered = true;
                    } catch (error) {
                        console.error('Timeout answer error:', error);
                    }
                }
            }, 15000); // 15 seconds

            return res.json({
                response: greetingResponse,
                sessionId,
                waitingForName: true
            });
        }

        // If second message and we have a pending question, this might be their name
        if (chatSession.pendingFirstMessage) {
            // Clear timeout since they responded
            if (chatSession.nameTimeout) {
                clearTimeout(chatSession.nameTimeout);
                chatSession.nameTimeout = null;
            }

            // Extract potential name from message (simple heuristic)
            const nameMatch = message.match(/(?:I'm|I am|my name is|this is|it's)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i) ||
                              message.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$/);

            if (nameMatch) {
                chatSession.userInfo.name = nameMatch[1];
            } else if (message.split(' ').length <= 3 && /^[A-Z]/i.test(message)) {
                // If it's a short response starting with capital, assume it's a name
                chatSession.userInfo.name = message.trim();
            }

            // Now answer the original question with their name if we got it
            const namePrefix = chatSession.userInfo.name ? `Great to meet you, ${chatSession.userInfo.name}! ` : '';

            // Add the original question back to get AI response
            chatSession.messages.push({
                role: 'user',
                content: chatSession.pendingFirstMessage
            });

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: SARAH_SYSTEM_PROMPT },
                    ...chatSession.messages
                ],
                temperature: 0.8,
                max_tokens: 800
            });

            let aiResponse = completion.choices[0].message.content;

            // Add name prefix if we got their name
            aiResponse = namePrefix + aiResponse;

            chatSession.messages.push({
                role: 'assistant',
                content: aiResponse
            });

            chatSession.transcript.push({
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date()
            });

            // Clear pending message
            chatSession.pendingFirstMessage = null;

            return res.json({
                response: aiResponse,
                sessionId
            });
        }

        // If this is message after auto-answer (they didn't respond within 30 sec but now continuing)
        if (chatSession.autoAnswered && !chatSession.userInfo.name) {
            // Try to extract name from this message
            const nameMatch = message.match(/(?:I'm|I am|my name is|this is|it's)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i) ||
                              message.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$/);

            if (nameMatch) {
                chatSession.userInfo.name = nameMatch[1];
            } else if (message.split(' ').length <= 3 && /^[A-Z]/i.test(message)) {
                chatSession.userInfo.name = message.trim();
            }

            chatSession.autoAnswered = false; // Clear flag
        }

        // Regular conversation - Call OpenAI
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SARAH_SYSTEM_PROMPT },
                ...chatSession.messages
            ],
            temperature: 0.8,
            max_tokens: 800
        });

        const aiResponse = completion.choices[0].message.content;

        // Add AI response to history
        chatSession.messages.push({
            role: 'assistant',
            content: aiResponse
        });

        chatSession.transcript.push({
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date()
        });

        // Update user info if provided
        if (userInfo) {
            chatSession.userInfo = { ...chatSession.userInfo, ...userInfo };
        }

        res.json({
            response: aiResponse,
            sessionId
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process chat message' });
    }
});

// Poll for new messages (for auto-responses from server)
app.get('/api/chat/poll/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { lastMessageIndex } = req.query;

        if (!activeChats.has(sessionId)) {
            return res.json({ newMessages: [] });
        }

        const chatSession = activeChats.get(sessionId);
        const lastIndex = parseInt(lastMessageIndex) || 0;

        // Get messages from transcript that are after the last index
        const newMessages = chatSession.transcript.slice(lastIndex).filter(msg => msg.role === 'assistant');

        res.json({
            newMessages: newMessages.map(msg => msg.content),
            currentIndex: chatSession.transcript.length
        });

    } catch (error) {
        console.error('Poll error:', error);
        res.status(500).json({ error: 'Failed to poll messages' });
    }
});

// End chat and send transcript
app.post('/api/chat/end', async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!activeChats.has(sessionId)) {
            return res.status(404).json({ error: 'Chat session not found' });
        }

        const chatSession = activeChats.get(sessionId);

        // Format transcript for email
        const transcriptText = chatSession.transcript.map(msg => {
            const time = new Date(msg.timestamp).toLocaleTimeString();
            const sender = msg.role === 'user' ? 'Visitor' : 'Sarah AI';
            return `[${time}] ${sender}: ${msg.content}`;
        }).join('\n\n');

        const duration = Math.round((new Date() - chatSession.startTime) / 1000 / 60);

        // Create email
        const emailHtml = `
            <h2>New Website Chat Transcript</h2>
            <p><strong>Session ID:</strong> ${sessionId}</p>
            <p><strong>Duration:</strong> ${duration} minutes</p>
            <p><strong>Messages:</strong> ${chatSession.transcript.length}</p>

            ${chatSession.userInfo.name ? `<p><strong>Name:</strong> ${chatSession.userInfo.name}</p>` : ''}
            ${chatSession.userInfo.email ? `<p><strong>Email:</strong> ${chatSession.userInfo.email}</p>` : ''}
            ${chatSession.userInfo.phone ? `<p><strong>Phone:</strong> ${chatSession.userInfo.phone}</p>` : ''}
            ${chatSession.userInfo.dealership ? `<p><strong>Dealership:</strong> ${chatSession.userInfo.dealership}</p>` : ''}
            ${chatSession.userInfo.role ? `<p><strong>Role:</strong> ${chatSession.userInfo.role}</p>` : ''}

            <hr>
            <h3>Chat Transcript:</h3>
            <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${transcriptText}</pre>
        `;

        // Send email
        await emailTransporter.sendMail({
            from: 'sarahai@supremeone.net',
            to: 'sarahai@supremeone.net',
            subject: `Website Chat Transcript - ${sessionId}`,
            html: emailHtml
        });

        // Clean up
        activeChats.delete(sessionId);

        res.json({ success: true, message: 'Transcript sent' });

    } catch (error) {
        console.error('End chat error:', error);
        res.status(500).json({ error: 'Failed to send transcript' });
    }
});

// Capture contact info
app.post('/api/contact/capture', async (req, res) => {
    try {
        const { sessionId, contactInfo } = req.body;

        if (activeChats.has(sessionId)) {
            const chatSession = activeChats.get(sessionId);
            chatSession.userInfo = { ...chatSession.userInfo, ...contactInfo };
        }

        // Send immediate notification email
        const emailHtml = `
            <h2>New Lead Captured via Sarah AI Chat</h2>
            <p><strong>Name:</strong> ${contactInfo.name || 'Not provided'}</p>
            <p><strong>Email:</strong> ${contactInfo.email || 'Not provided'}</p>
            <p><strong>Phone:</strong> ${contactInfo.phone || 'Not provided'}</p>
            <p><strong>Dealership:</strong> ${contactInfo.dealership || 'Not provided'}</p>
            <p><strong>Role:</strong> ${contactInfo.role || 'Not provided'}</p>
            <p><strong>Interest:</strong> ${contactInfo.interest || 'Not specified'}</p>
            <p><strong>Session ID:</strong> ${sessionId}</p>
            <p><em>Full transcript will be sent when chat ends.</em></p>
        `;

        await emailTransporter.sendMail({
            from: 'sarahai@supremeone.net',
            to: 'sarahai@supremeone.net',
            subject: `🎯 New Lead: ${contactInfo.name || 'Website Visitor'}`,
            html: emailHtml
        });

        res.json({ success: true });

    } catch (error) {
        console.error('Contact capture error:', error);
        res.status(500).json({ error: 'Failed to capture contact' });
    }
});

// Calendly integration - get available times
app.get('/api/calendly/availability', async (req, res) => {
    try {
        // Return Calendly scheduling URL
        res.json({
            calendlyUrl: 'https://calendly.com/sarahai-supremeone/30min'
        });
    } catch (error) {
        console.error('Calendly error:', error);
        res.status(500).json({ error: 'Failed to get availability' });
    }
});

// Visitor tracking
app.post('/api/visitor/track', async (req, res) => {
    try {
        const { visitorId, page } = req.body;
        const visitorData = await getVisitorCount();

        // Get visitor IP and location
        const ip = getClientIP(req);
        const location = await getGeolocation(ip);

        const today = new Date().toISOString().split('T')[0];
        const timestamp = new Date().toISOString();

        // Update counts
        visitorData.total = (visitorData.total || 0) + 1;

        if (!visitorData.unique) visitorData.unique = new Set();
        if (Array.isArray(visitorData.unique)) {
            visitorData.unique = new Set(visitorData.unique);
        }
        visitorData.unique.add(visitorId);

        if (!visitorData.daily) visitorData.daily = {};
        if (!visitorData.daily[today]) {
            visitorData.daily[today] = { total: 0, unique: new Set() };
        }
        if (Array.isArray(visitorData.daily[today].unique)) {
            visitorData.daily[today].unique = new Set(visitorData.daily[today].unique);
        }

        visitorData.daily[today].total++;
        visitorData.daily[today].unique.add(visitorId);

        // Store detailed visitor info with location
        if (!visitorData.visitors) visitorData.visitors = [];
        visitorData.visitors.push({
            visitorId,
            page,
            ip: location.ip,
            city: location.city,
            region: location.region,
            country: location.country,
            zip: location.zip,
            lat: location.lat,
            lon: location.lon,
            isp: location.isp,
            timestamp,
            date: today
        });

        // Keep only last 500 visitor records to avoid file bloat
        if (visitorData.visitors.length > 500) {
            visitorData.visitors = visitorData.visitors.slice(-500);
        }

        await saveVisitorCount(visitorData);

        res.json({
            totalVisitors: visitorData.total,
            uniqueVisitors: visitorData.unique.size,
            todayTotal: visitorData.daily[today].total,
            todayUnique: visitorData.daily[today].unique.size,
            location: {
                city: location.city,
                region: location.region,
                country: location.country
            }
        });

    } catch (error) {
        console.error('Visitor tracking error:', error);
        res.status(500).json({ error: 'Failed to track visitor' });
    }
});

// Get visitor stats
app.get('/api/visitor/stats', async (req, res) => {
    try {
        const visitorData = await getVisitorCount();
        const today = new Date().toISOString().split('T')[0];

        const todayData = visitorData.daily?.[today] || { total: 0, unique: new Set() };

        res.json({
            totalVisitors: visitorData.total || 0,
            uniqueVisitors: Array.isArray(visitorData.unique) ? visitorData.unique.length : (visitorData.unique?.size || 0),
            todayTotal: todayData.total || 0,
            todayUnique: Array.isArray(todayData.unique) ? todayData.unique.length : (todayData.unique?.size || 0)
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Track page view
app.post('/api/analytics/pageview', async (req, res) => {
    try {
        const { page } = req.body;
        const analytics = await getAnalytics();

        if (!analytics.pageViews[page]) {
            analytics.pageViews[page] = { count: 0, lastVisit: null };
        }

        analytics.pageViews[page].count++;
        analytics.pageViews[page].lastVisit = new Date().toISOString();

        await saveAnalytics(analytics);

        res.json({ success: true });
    } catch (error) {
        console.error('Page view tracking error:', error);
        res.status(500).json({ error: 'Failed to track page view' });
    }
});

// Track chat session
app.post('/api/analytics/chat', async (req, res) => {
    try {
        const { sessionId, action, data } = req.body;
        const analytics = await getAnalytics();

        if (action === 'start') {
            analytics.chats.total++;
            analytics.chats.sessions.push({
                sessionId,
                startTime: new Date().toISOString(),
                messageCount: 0,
                userInfo: data || {}
            });
        } else if (action === 'message') {
            const session = analytics.chats.sessions.find(s => s.sessionId === sessionId);
            if (session) {
                session.messageCount++;
                session.lastMessage = new Date().toISOString();
            }
        } else if (action === 'end') {
            const session = analytics.chats.sessions.find(s => s.sessionId === sessionId);
            if (session) {
                session.endTime = new Date().toISOString();
                session.duration = data?.duration || 0;
            }
        }

        await saveAnalytics(analytics);

        res.json({ success: true });
    } catch (error) {
        console.error('Chat tracking error:', error);
        res.status(500).json({ error: 'Failed to track chat' });
    }
});

// Track button clicks
app.post('/api/analytics/click', async (req, res) => {
    try {
        const { element, page } = req.body;
        const analytics = await getAnalytics();

        const key = `${page}:${element}`;
        if (!analytics.clicks[key]) {
            analytics.clicks[key] = { count: 0, lastClick: null, element, page };
        }

        analytics.clicks[key].count++;
        analytics.clicks[key].lastClick = new Date().toISOString();

        await saveAnalytics(analytics);

        res.json({ success: true });
    } catch (error) {
        console.error('Click tracking error:', error);
        res.status(500).json({ error: 'Failed to track click' });
    }
});

// Get analytics data
app.get('/api/analytics/dashboard', async (req, res) => {
    try {
        const analytics = await getAnalytics();
        const visitorData = await getVisitorCount();

        // Process chat sessions for display
        const recentChats = analytics.chats.sessions
            .slice(-20)
            .reverse()
            .map(session => ({
                sessionId: session.sessionId,
                startTime: session.startTime,
                endTime: session.endTime,
                messageCount: session.messageCount,
                duration: session.duration,
                userInfo: session.userInfo
            }));

        // Sort page views by count
        const topPages = Object.entries(analytics.pageViews)
            .map(([page, data]) => ({ page, ...data }))
            .sort((a, b) => b.count - a.count);

        // Sort clicks by count
        const topClicks = Object.entries(analytics.clicks)
            .map(([key, data]) => data)
            .sort((a, b) => b.count - a.count);

        const today = new Date().toISOString().split('T')[0];
        const todayData = visitorData.daily?.[today] || { total: 0, unique: new Set() };

        // Get recent visitor locations (last 50)
        const recentVisitors = (visitorData.visitors || [])
            .slice(-50)
            .reverse()
            .map(v => ({
                city: v.city,
                region: v.region,
                country: v.country,
                ip: v.ip,
                page: v.page,
                timestamp: v.timestamp,
                isp: v.isp
            }));

        // Count visitors by location
        const locationCounts = {};
        (visitorData.visitors || []).forEach(v => {
            const key = v.country === 'Local' ? 'Local' : `${v.city}, ${v.region}, ${v.country}`;
            locationCounts[key] = (locationCounts[key] || 0) + 1;
        });

        const topLocations = Object.entries(locationCounts)
            .map(([location, count]) => ({ location, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);

        res.json({
            visitors: {
                total: visitorData.total || 0,
                unique: Array.isArray(visitorData.unique) ? visitorData.unique.length : (visitorData.unique?.size || 0),
                today: todayData.total || 0,
                todayUnique: Array.isArray(todayData.unique) ? todayData.unique.length : (todayData.unique?.size || 0),
                recent: recentVisitors,
                topLocations
            },
            chats: {
                total: analytics.chats.total,
                recent: recentChats
            },
            pageViews: topPages,
            clicks: topClicks,
            created: analytics.created
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// Contact form submission
app.post('/api/contact/submit', async (req, res) => {
    try {
        const { name, email, phone, company, interest, message } = req.body;

        // Validate required fields
        if (!name || !email || !message || !interest) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, message, and interest are required'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address'
            });
        }

        // Format the notification email to you
        const notificationHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px;">
                    New Contact Form Submission
                </h2>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #333;">Contact Information</h3>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                    ${phone ? `<p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>` : ''}
                    ${company ? `<p><strong>Dealership/Company:</strong> ${company}</p>` : ''}
                    <p><strong>Interest:</strong> ${interest}</p>
                </div>

                <div style="background: #fff; padding: 20px; border-left: 4px solid #1e40af; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #333;">Message</h3>
                    <p style="line-height: 1.6; white-space: pre-wrap;">${message}</p>
                </div>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                    <p>Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST</p>
                    <p>This email was automatically generated from the Supreme One website contact form.</p>
                </div>
            </div>
        `;

        // Format the auto-reply email to the sender
        const autoReplyHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #1e40af 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Supreme One</h1>
                        <p style="margin: 8px 0 0 0; font-size: 16px; color: rgba(255, 255, 255, 0.95); font-weight: 600; letter-spacing: 0.5px;">Ignite Passion, Inspire Performance</p>
                        <div style="margin-top: 5px; font-size: 11px; color: rgba(255, 255, 255, 0.8); text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Patent Pending</div>
                    </div>

                    <!-- Main Content -->
                    <div style="padding: 40px 30px; background-color: #ffffff;">
                        <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1f2937;">Thank You for Contacting Us!</h2>

                        <p style="margin: 0 0 16px 0; line-height: 1.8; color: #1f2937; font-size: 16px;">Hi <strong>${name}</strong>,</p>

                        <p style="margin: 0 0 16px 0; line-height: 1.8; color: #1f2937; font-size: 16px;">
                            Thank you for your interest in <strong>Supreme One</strong>! We've received your message and one of our experts will reach out to you very soon.
                        </p>

                        <p style="margin: 0 0 24px 0; line-height: 1.8; color: #1f2937; font-size: 16px;">
                            In the meantime, explore our revolutionary AI-powered F&I training platform:
                        </p>

                        <!-- Links Box -->
                        <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 24px; border-radius: 12px; margin: 0 0 24px 0; border-left: 4px solid #1e40af;">
                            <div style="margin-bottom: 12px;">
                                <a href="https://supremeone.net/platform.html" style="color: #1e40af; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block; padding: 8px 0;">
                                    <span style="color: #10b981; margin-right: 8px;">✓</span>Training Platform Overview
                                </a>
                            </div>
                            <div style="margin-bottom: 12px;">
                                <a href="https://supremeone.net/academy.html" style="color: #1e40af; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block; padding: 8px 0;">
                                    <span style="color: #10b981; margin-right: 8px;">✓</span>Supreme One Academy
                                </a>
                            </div>
                            <div style="margin-bottom: 12px;">
                                <a href="https://supremeone.net/book.html" style="color: #1e40af; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block; padding: 8px 0;">
                                    <span style="color: #10b981; margin-right: 8px;">✓</span>Passionate Consulting Book
                                </a>
                            </div>
                            <div>
                                <a href="https://supremeone.net/about.html#demo" style="color: #1e40af; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block; padding: 8px 0;">
                                    <span style="color: #10b981; margin-right: 8px;">✓</span>Schedule a Demo
                                </a>
                            </div>
                        </div>

                        <!-- Contact Info -->
                        <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
                            <p style="margin: 0 0 12px 0; font-size: 15px; color: #6b7280; font-weight: 600;">Need immediate assistance?</p>
                            <p style="margin: 0; line-height: 1.6; color: #1f2937; font-size: 15px;">
                                📞 <a href="tel:+18644029723" style="color: #1e40af; text-decoration: none; font-weight: 600;">(864) 402-9723</a><br>
                                📧 <a href="mailto:sarahai@supremeone.net" style="color: #1e40af; text-decoration: none; font-weight: 600;">sarahai@supremeone.net</a>
                            </p>
                        </div>

                        <p style="margin: 0; line-height: 1.8; color: #1f2937; font-size: 16px;">
                            Best regards,<br>
                            <strong style="color: #1e40af;">The Supreme One Team</strong>
                        </p>
                        <p style="margin: 8px 0 0 0; color: #dc2626; font-size: 14px; font-weight: 600;">
                            💬 Powered by Sarah AI
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #1f2937; padding: 30px; text-align: center;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: rgba(255, 255, 255, 0.9); font-weight: 600;">Supreme One, LLC</p>
                        <p style="margin: 0 0 12px 0; font-size: 13px; color: rgba(255, 255, 255, 0.7); line-height: 1.6;">
                            10 Kelvyn St, Greer, SC 29651<br>
                            Phone: (864) 402-9723 | Email: sarahai@supremeone.net
                        </p>
                        <p style="margin: 0; font-size: 12px; color: rgba(255, 255, 255, 0.6);">
                            <a href="https://supremeone.net" style="color: #60a5fa; text-decoration: none;">www.supremeone.net</a>
                        </p>
                        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <p style="margin: 0; font-size: 11px; color: rgba(255, 255, 255, 0.5);">
                                © 2025 Supreme One. All rights reserved. Patent Pending.
                            </p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Send notification email to you
        await emailTransporter.sendMail({
            from: 'sarahai@supremeone.net',
            to: 'sarahai@supremeone.net',
            replyTo: email,
            subject: `📧 New Contact Form: ${name} - ${interest}`,
            html: notificationHtml
        });

        // Send auto-reply to the person who filled out the form
        await emailTransporter.sendMail({
            from: 'sarahai@supremeone.net',
            to: email,
            subject: 'Thank You for Contacting Supreme One!',
            html: autoReplyHtml
        });

        res.json({
            success: true,
            message: 'Your message has been sent successfully! Check your email for confirmation.'
        });

    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message. Please try again or call us at (864) 402-9723.'
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'supreme-one-website-api' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Supreme One Website API running on port ${PORT}`);
    console.log(`✅ Sarah AI chatbot ready`);
    console.log(`✅ Email notifications active`);
    console.log(`✅ Visitor tracking enabled`);
});
