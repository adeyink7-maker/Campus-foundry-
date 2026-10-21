import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseWebSocketReturn {
  isConnected: boolean;
  sendEvent: (event: string, data: any) => boolean;
}

export const useWebSocket = (url: string, token?: string): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        const fullUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
        ws = new WebSocket(fullUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onclose = () => {
          setIsConnected(false);
          // Try reconnect after 3s
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          setIsConnected(false);
          if (ws) {
            ws.close();
          }
        };
      } catch (err) {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, [url, token]);

  const sendEvent = useCallback((event: string, data: any): boolean => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, data, timestamp: Date.now() }));
      return true;
    }
    return false;
  }, []);

  return { isConnected, sendEvent };
};

export default useWebSocket;
