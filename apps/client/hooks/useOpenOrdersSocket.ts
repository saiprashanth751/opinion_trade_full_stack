import { useEffect, useState, useRef } from 'react';
import { Order, MessageFromApi, MessageToApi } from '@trade/types'; // Assuming Order is exported from @trade/types

interface OpenOrdersHookResult {
  openOrders: Order[];
  loading: boolean;
  error: string | null;
  fetchOrders: (userId: string, eventIds: string[]) => void;
}

export const useOpenOrdersSocket = (): OpenOrdersHookResult => {
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string | null>(null);
  const pendingRequests = useRef<Set<string>>(new Set()); // To track pending requests
  const collectedOrders = useRef<Order[]>([]); // To collect orders from multiple responses

  const initializeWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const ws = new WebSocket(process.env.NEXT_PUBLIC_WSS_URL || 'ws://localhost:8080');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to WebSocket for open orders.");
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const message: MessageToApi | { type: "CLIENT_ID"; payload: { clientId: string } } = JSON.parse(event.data);

        if (message.type === "CLIENT_ID") {
          clientIdRef.current = message.payload.clientId;
          console.log("Received client ID:", clientIdRef.current);
        } else if (message.type === "OPEN_ORDERS") {
          // Assuming the engine sends back OPEN_ORDERS for each market requested
          // We need a way to know when all requests for a batch are complete.
          // This is tricky with the current message structure.
          // For simplicity, we'll just append and assume the caller manages the loading state.
          collectedOrders.current = [...collectedOrders.current, ...message.payload.openOrders];
          // A more robust solution would involve tracking request IDs or a final "all orders sent" message.
          // For now, we'll rely on the `fetchOrders` function to manage `setLoading(false)`
          // after all expected responses are received or a timeout.
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
        setError("Failed to process WebSocket message.");
      }
    };

    ws.onclose = () => {
      console.log("Disconnected from WebSocket for open orders.");
      clientIdRef.current = null;
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setError("WebSocket connection error.");
    };
  };

  useEffect(() => {
    initializeWebSocket();

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []); // Run once on mount to establish connection

  const fetchOrders = async (userId: string, eventIds: string[]) => {
    if (!clientIdRef.current) {
      setError("WebSocket client ID not available. Please wait or refresh.");
      return;
    }
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError("WebSocket not connected. Please wait or refresh.");
      return;
    }

    setLoading(true);
    setError(null);
    collectedOrders.current = [];

    pendingRequests.current.clear();
    eventIds.forEach(eventId => pendingRequests.current.add(eventId));

    let receivedCount = 0;
    const totalRequests = eventIds.length;

    // Create a promise that resolves when all expected responses are received
    // or after a timeout. This is a workaround for the lack of request IDs.
    const responsePromise = new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => {
        console.warn("Timeout waiting for all open order responses.");
        resolve();
      }, 5000); // 5-second timeout

      const originalOnMessage = wsRef.current!.onmessage; // Store original handler

      wsRef.current!.onmessage = (event) => {
        originalOnMessage.call(wsRef.current, event); // Call the original handler with correct context

        try {
          const message: MessageToApi | { type: "CLIENT_ID"; payload: { clientId: string } } = JSON.parse(event.data);
          if (message.type === "OPEN_ORDERS") {
            // This is a very basic way to track completion.
            // A more robust solution would involve a unique request ID for each GET_OPEN_ORDERS message.
            receivedCount++;
            if (receivedCount >= totalRequests) {
              clearTimeout(timeoutId);
              resolve();
            }
          }
        } catch (e) {
          // Ignore parsing errors, handled by originalOnMessage
        }
      };
    });

    eventIds.forEach((eventId) => {
      const message: MessageFromApi = {
        type: "GET_OPEN_ORDERS",
        data: {
          userId: userId,
          market: eventId,
        },
      };
      wsRef.current?.send(JSON.stringify({ clientId: clientIdRef.current, message })); // Wrap message with clientId
    });

    await responsePromise; // Wait for all responses or timeout

    setOpenOrders(collectedOrders.current);
    setLoading(false);
  };

  return { openOrders, loading, error, fetchOrders };
};
