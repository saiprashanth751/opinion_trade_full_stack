// apps/client/hooks/useOpenOrdersSocket.ts
import { useEffect, useState, useRef } from 'react';
import { Order, MessageToApi } from '@trade/types';

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
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingRequestsRef = useRef<Set<string>>(new Set());

    const initializeWebSocket = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            return;
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
                    console.log("Received open orders:", message.payload.openOrders);
                    
                    // Clear timeout since we received a response
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                        timeoutRef.current = null;
                    }
                    
                    // Clear pending requests
                    pendingRequestsRef.current.clear();
                    
                    setOpenOrders(message.payload.openOrders);
                    setLoading(false);
                    setError(null);
                }
            } catch (err) {
                console.error("Failed to parse WebSocket message:", err);
                setError("Failed to process WebSocket message.");
                setLoading(false);
            }
        };

        ws.onclose = () => {
            console.log("Disconnected from WebSocket for open orders.");
            clientIdRef.current = null;
            // Clear any pending timeouts
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
            setError("WebSocket connection error.");
            setLoading(false);
        };
    };

    useEffect(() => {
        initializeWebSocket();

        return () => {
            // Cleanup timeouts
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
        };
    }, []);

    const fetchOrders = async (userId: string, eventIds: string[]) => {
        console.log("fetchOrders called with:", { userId, eventIds });
        
        if (!clientIdRef.current) {
            setError("WebSocket client ID not available. Please wait or refresh.");
            return;
        }
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            setError("WebSocket not connected. Please wait or refresh.");
            return;
        }

        // Clear previous timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        setLoading(true);
        setError(null);
        
        // Don't clear openOrders immediately - keep showing previous data while loading
        // setOpenOrders([]);

        try {
            // Track pending requests
            eventIds.forEach(eventId => pendingRequestsRef.current.add(eventId));
            
            // Send GET_OPEN_ORDERS request for each eventId
            for (const eventId of eventIds) {
                const message = {
                    type: "GET_OPEN_ORDERS",
                    data: {
                        userId: userId,
                        market: eventId,
                    },
                };
                
                console.log("Sending GET_OPEN_ORDERS message:", message);
                wsRef.current.send(JSON.stringify(message));
            }

            // Set a timeout with longer duration and better error handling
            timeoutRef.current = setTimeout(() => {
                console.log("Timeout reached for open orders request");
                
                // Only show timeout error if we're still loading and have pending requests
                if (loading && pendingRequestsRef.current.size > 0) {
                    setLoading(false);
                    setError("Request timed out. Please try again.");
                    pendingRequestsRef.current.clear();
                }
                
                timeoutRef.current = null;
            }, 15000); // Increased timeout to 15 seconds

        } catch (error) {
            console.error("Error fetching orders:", error);
            setError("Failed to fetch orders.");
            setLoading(false);
            pendingRequestsRef.current.clear();
            
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        }
    };

    return { openOrders, loading, error, fetchOrders };
};