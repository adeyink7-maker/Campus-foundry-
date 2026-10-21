import type { Plugin, ViteDevServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage, ServerResponse } from 'http';
import type { ChatMessage, ChatConversation } from '../types';

// In-memory persistent server state
const initialConversations: ChatConversation[] = [
  {
    id: 'conv_dami_lagos',
    businessId: 'dami-pastries-unilorin',
    businessName: "Dami's Crust & Hot Bakes",
    businessImageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    traderName: 'Damilola Adeleke',
    traderId: 'trader_dami',
    traderHostel: 'Lagos Hostel, Block C Rm 204',
    buyerId: 'student_buyer_unilorin',
    buyerName: 'Adeyinka (Student Buyer)',
    buyerEmail: 'adeyink7@gmail.com',
    lastMessage: 'Warm beef pies just finished baking! Ready to deliver to Block B.',
    lastMessageTimestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    unreadCount: 1,
  },
  {
    id: 'conv_tunde_tech',
    businessId: 'campus-screen-gadgets',
    businessName: 'PS Tech Lab & Screen Repair',
    businessImageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    traderName: 'Tunde Oladipo',
    traderId: 'trader_tunde',
    traderHostel: 'CIS Quad / Basement Walkway',
    buyerId: 'student_buyer_unilorin',
    buyerName: 'Adeyinka (Student Buyer)',
    buyerEmail: 'adeyink7@gmail.com',
    lastMessage: 'Yes, original iPhone screen replacement comes with a 30-day warranty.',
    lastMessageTimestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
    unreadCount: 0,
  },
];

const initialMessages: ChatMessage[] = [
  {
    id: 'msg_init_1',
    conversationId: 'conv_dami_lagos',
    businessId: 'dami-pastries-unilorin',
    businessName: "Dami's Crust & Hot Bakes",
    senderId: 'student_buyer_unilorin',
    senderName: 'Adeyinka (Student Buyer)',
    senderRole: 'student',
    recipientId: 'trader_dami',
    recipientName: 'Damilola Adeleke',
    text: 'Hello Dami! Are you taking snack box orders for Lagos Hostel tonight?',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    isRead: true,
    hostelLocation: 'Lagos Hostel, Block B',
  },
  {
    id: 'msg_init_2',
    conversationId: 'conv_dami_lagos',
    businessId: 'dami-pastries-unilorin',
    businessName: "Dami's Crust & Hot Bakes",
    senderId: 'trader_dami',
    senderName: 'Damilola Adeleke',
    senderRole: 'trader',
    recipientId: 'student_buyer_unilorin',
    recipientName: 'Adeyinka (Student Buyer)',
    text: 'Warm beef pies just finished baking! Ready to deliver to Block B.',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    isRead: false,
    hostelLocation: 'Lagos Hostel, Block C Rm 204',
    orderSnippet: {
      items: [{ name: 'Jumbo Flaky Beef Meat Pie', quantity: 2, price: 900 }],
      totalAmount: 1800,
      deliveryRoom: 'Lagos Hostel, Block B Rm 102',
      status: 'pending',
    },
  },
  {
    id: 'msg_init_3',
    conversationId: 'conv_tunde_tech',
    businessId: 'campus-screen-gadgets',
    businessName: 'PS Tech Lab & Screen Repair',
    senderId: 'student_buyer_unilorin',
    senderName: 'Adeyinka (Student Buyer)',
    senderRole: 'student',
    recipientId: 'trader_tunde',
    recipientName: 'Tunde Oladipo',
    text: 'Do you have screen panels for iPhone 11 and how long does testing take?',
    timestamp: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    isRead: true,
  },
  {
    id: 'msg_init_4',
    conversationId: 'conv_tunde_tech',
    businessId: 'campus-screen-gadgets',
    businessName: 'PS Tech Lab & Screen Repair',
    senderId: 'trader_tunde',
    senderName: 'Tunde Oladipo',
    senderRole: 'trader',
    recipientId: 'student_buyer_unilorin',
    recipientName: 'Adeyinka (Student Buyer)',
    text: 'Yes, original iPhone screen replacement comes with a 30-day warranty. Testing takes only 20 mins at CIS Quad.',
    timestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
    isRead: true,
    hostelLocation: 'CIS Quad Basement',
  },
];

const conversationsMap = new Map<string, ChatConversation>();
initialConversations.forEach((c) => conversationsMap.set(c.id, c));

const messagesList: ChatMessage[] = [...initialMessages];
const connectedClients = new Set<{ ws: WebSocket; userId?: string; role?: string }>();

function broadcast(data: any, excludeWs?: WebSocket) {
  const payload = JSON.stringify(data);
  for (const client of connectedClients) {
    if (client.ws.readyState === WebSocket.OPEN && client.ws !== excludeWs) {
      client.ws.send(payload);
    }
  }
}

export function chatWebSocketPlugin(): Plugin {
  return {
    name: 'campus-foundry-chat-ws',
    configureServer(server: ViteDevServer) {
      const wss = new WebSocketServer({ noServer: true });

      // Handle HTTP Upgrade to WebSocket
      server.httpServer?.on('upgrade', (req, socket, head) => {
        const url = req.url || '';
        if (url.startsWith('/ws/chat')) {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
          });
        }
      });

      // WebSocket Connection Lifecycle
      wss.on('connection', (ws: WebSocket) => {
        const clientInfo = { ws, userId: '', role: '' };
        connectedClients.add(clientInfo);

        // Send current state on connection
        ws.send(
          JSON.stringify({
            type: 'init_sync',
            conversations: Array.from(conversationsMap.values()),
            messages: messagesList,
          })
        );

        ws.on('message', (rawData) => {
          try {
            const data = JSON.parse(rawData.toString());

            switch (data.type) {
              case 'identify': {
                clientInfo.userId = data.userId;
                clientInfo.role = data.role;
                break;
              }

              case 'send_message': {
                const msg: ChatMessage = data.message;
                if (!msg || !msg.id || !msg.text) return;

                // Idempotent existence check
                const exists = messagesList.some((m) => m.id === msg.id);
                if (!exists) {
                  messagesList.push(msg);

                  // Update or create conversation
                  let conv = conversationsMap.get(msg.conversationId);
                  if (conv) {
                    conv.lastMessage = msg.text;
                    conv.lastMessageTimestamp = msg.timestamp;
                    conv.unreadCount = (conv.unreadCount || 0) + 1;
                  } else {
                    conv = {
                      id: msg.conversationId,
                      businessId: msg.businessId,
                      businessName: msg.businessName,
                      businessImageUrl: data.businessImageUrl || '',
                      traderName: msg.senderRole === 'trader' ? msg.senderName : msg.recipientName,
                      traderId: msg.senderRole === 'trader' ? msg.senderId : msg.recipientId,
                      traderHostel: msg.hostelLocation || 'UNILORIN Hostels',
                      buyerId: msg.senderRole === 'student' ? msg.senderId : msg.recipientId,
                      buyerName: msg.senderRole === 'student' ? msg.senderName : msg.recipientName,
                      lastMessage: msg.text,
                      lastMessageTimestamp: msg.timestamp,
                      unreadCount: 1,
                    };
                    conversationsMap.set(conv.id, conv);
                  }

                  // Broadcast to all clients
                  broadcast({
                    type: 'message_received',
                    message: msg,
                    conversation: conv,
                  });
                }
                break;
              }

              case 'mark_read': {
                const convId = data.conversationId;
                const conv = conversationsMap.get(convId);
                if (conv) {
                  conv.unreadCount = 0;
                  messagesList.forEach((m) => {
                    if (m.conversationId === convId) {
                      m.isRead = true;
                    }
                  });
                  broadcast({
                    type: 'conversation_read',
                    conversationId: convId,
                  });
                }
                break;
              }

              case 'typing': {
                broadcast(
                  {
                    type: 'user_typing',
                    conversationId: data.conversationId,
                    userName: data.userName,
                    isTyping: data.isTyping,
                  },
                  ws
                );
                break;
              }
            }
          } catch (e) {
            console.error('Error handling WebSocket chat message:', e);
          }
        });

        ws.on('close', () => {
          connectedClients.delete(clientInfo);
        });

        ws.on('error', (err) => {
          console.error('WebSocket client error:', err);
          connectedClients.delete(clientInfo);
        });
      });

      // REST Endpoints via Connect middleware
      server.middlewares.use('/api/chat', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url || '';

        // CORS & JSON headers
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method === 'GET' && url.startsWith('/conversations')) {
          res.statusCode = 200;
          res.end(JSON.stringify(Array.from(conversationsMap.values())));
          return;
        }

        if (req.method === 'GET' && url.startsWith('/messages')) {
          res.statusCode = 200;
          res.end(JSON.stringify(messagesList));
          return;
        }

        if (req.method === 'POST' && url.startsWith('/send')) {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const msg: ChatMessage = JSON.parse(body);
              if (!msg.id) msg.id = 'msg_' + Date.now();
              if (!messagesList.some((m) => m.id === msg.id)) {
                messagesList.push(msg);

                let conv = conversationsMap.get(msg.conversationId);
                if (conv) {
                  conv.lastMessage = msg.text;
                  conv.lastMessageTimestamp = msg.timestamp;
                }
                broadcast({
                  type: 'message_received',
                  message: msg,
                  conversation: conv,
                });
              }
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: msg }));
            } catch (err: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err?.message || 'Invalid payload' }));
            }
          });
          return;
        }

        next();
      });

      // Persistent Cart & Ordering REST Endpoints
      const serverCarts = new Map<string, any[]>();
      const serverOrders: any[] = [];

      server.middlewares.use('/api/commerce', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url || '';

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        // GET /api/commerce/cart?key=...
        if (req.method === 'GET' && url.startsWith('/cart')) {
          const parsedUrl = new URL(url, 'http://localhost');
          const key = parsedUrl.searchParams.get('key') || 'default';
          const items = serverCarts.get(key) || [];
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, items }));
          return;
        }

        // POST /api/commerce/cart/sync
        if (req.method === 'POST' && url.startsWith('/cart/sync')) {
          let body = '';
          req.on('data', (c) => { body += c; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              if (data.key && Array.isArray(data.items)) {
                serverCarts.set(data.key, data.items);
              }
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: 'Cart synced to persistent store' }));
            } catch (e: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: e?.message || 'Invalid payload' }));
            }
          });
          return;
        }

        // POST /api/commerce/order
        if (req.method === 'POST' && url.startsWith('/order')) {
          let body = '';
          req.on('data', (c) => { body += c; });
          req.on('end', () => {
            try {
              const order = JSON.parse(body);
              if (!order.id) order.id = 'ord_' + Date.now();
              serverOrders.push(order);
              res.statusCode = 201;
              res.end(JSON.stringify({ success: true, order }));
            } catch (e: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: e?.message || 'Invalid payload' }));
            }
          });
          return;
        }

        // GET /api/commerce/orders
        if (req.method === 'GET' && url.startsWith('/orders')) {
          const parsedUrl = new URL(url, 'http://localhost');
          const userId = parsedUrl.searchParams.get('userId');
          const filtered = userId ? serverOrders.filter(o => o.buyerId === userId) : serverOrders;
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, orders: filtered }));
          return;
        }

        next();
      });

    },
  };
}
