// apps/client/hooks/useOrderbookSocket.ts
import { useEffect, useState, useRef } from 'react';
import { WsMessage, DepthUpdateMessage, TradeAddedMessage, ORDERBOOK_SNAPSHOT, MessageToApi, PriceUpdateMessage } from '@trade/types';

interface PricePoint {
    timestamp: number;
    yesPrice: number;
    noPrice: number;
}

interface OrderbookData {
    yesBids: [string, string][];
    yesAsks: [string, string][];
    noBids: [string, string][];
    noAsks: [string, string][];
    trades: TradeAddedMessage['data'][];
    yesPrice: number;
    noPrice: number;
    priceHistory: PricePoint[];
}

export const useOrderbookSocket = (eventId: string) => {
    const [data, setData] = useState<OrderbookData>({
        yesBids: [],
        yesAsks: [],
        noBids: [],
        noAsks: [],
        trades: [],
        yesPrice: 0,
        noPrice: 0,
        priceHistory: [],
    });

    const wsRef = useRef<WebSocket | null>(null);
    const tradesRef = useRef<TradeAddedMessage['data'][]>([]);
    const priceHistoryRef = useRef<PricePoint[]>([]);
    const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    // Helper type guards
    function isOrderbookSnapshot(
        message: WsMessage
    ): message is Extract<MessageToApi, { type: typeof ORDERBOOK_SNAPSHOT }> {
        return 'type' in message && message.type === ORDERBOOK_SNAPSHOT;
    }

    function isDepthUpdate(message: WsMessage): message is DepthUpdateMessage {
        return 'stream' in message && message.stream.startsWith('depth@');
    }

    function isTradeUpdate(message: WsMessage): message is TradeAddedMessage {
        return 'stream' in message && message.stream.startsWith('trade@');
    }

    function isPriceUpdate(message: WsMessage): message is PriceUpdateMessage {
        return 'type' in message && message.type === 'PRICE_UPDATE';
    }

    useEffect(() => {
        if (!eventId) return;

        console.log(`🔌 Connecting to WebSocket for event ${eventId}`);
        
        const ws = new WebSocket(process.env.NEXT_PUBLIC_WSS_URL || 'ws://localhost:8080');
        wsRef.current = ws;

        ws.onopen = () => {
            console.log(`✅ Connected to WebSocket for event ${eventId}`);
            setIsConnected(true);

            // Reset state for new connections
            setIsInitialDataLoaded(false);

            const subscribeMessage = {
                method: "subscribe_orderbook",
                events: [
                    `depth@${eventId}-yes`,
                    `depth@${eventId}-no`,
                    `trade@${eventId}-yes`,
                    `trade@${eventId}-no`,
                ],
            };
            
            console.log('📤 Sending subscription message:', subscribeMessage);
            ws.send(JSON.stringify(subscribeMessage));
        };

        ws.onmessage = (event) => {
            try {
                const message: WsMessage = JSON.parse(event.data);
                console.log('📨 Received WebSocket message:', {
                    type: 'type' in message ? message.type : 'stream',
                    stream: 'stream' in message ? message.stream : undefined,
                    hasData: 'data' in message ? !!message.data : false,
                    hasPayload: 'payload' in message ? !!message.payload : false
                });

                // Handle ORDERBOOK_SNAPSHOT messages (Initial data load)
                if (isOrderbookSnapshot(message)) {
                    console.log("📊 Processing initial orderbook snapshot");
                    const snapshot = message.payload;

                    // Initialize refs with snapshot data
                    priceHistoryRef.current = snapshot.priceHistory || [];
                    tradesRef.current = snapshot.trades || [];

                    setData({
                        yesBids: snapshot.yesBids || [],
                        yesAsks: snapshot.yesAsks || [],
                        noBids: snapshot.noBids || [],
                        noAsks: snapshot.noAsks || [],
                        trades: snapshot.trades || [],
                        yesPrice: snapshot.yesPrice || 0,
                        noPrice: snapshot.noPrice || 0,
                        priceHistory: snapshot.priceHistory || [],
                    });

                    setIsInitialDataLoaded(true);
                    console.log("✅ Initial data loaded successfully");
                }
                // Handle real-time depth updates
                else if (isDepthUpdate(message)) {
                    console.log("📈 Processing depth update:", message.stream);
                    handleDepthUpdate(message);
                }
                // Handle real-time trade updates
                else if (isTradeUpdate(message)) {
                    console.log("💰 Processing trade update:", message.stream);
                    handleTradeUpdate(message);
                }
                // Handle price history updates
                else if (isPriceUpdate(message)) {
                    console.log("📉 Processing price update");
                    handlePriceHistoryUpdate(message.payload);
                }
                else {
                    console.log("❓ Unknown message type:", message);
                }
            } catch (error) {
                console.error('❌ Failed to parse WebSocket message:', error, 'Raw message:', event.data);
            }
        };

        ws.onclose = (event) => {
            console.log(`🔌 Disconnected from WebSocket for event ${eventId}`, {
                code: event.code,
                reason: event.reason,
                wasClean: event.wasClean
            });
            setIsConnected(false);
            setIsInitialDataLoaded(false);
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            setIsConnected(false);
            setIsInitialDataLoaded(false);
        };

        return () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                const unsubscribeMessage = {
                    method: "unsubscribe_orderbook",
                    events: [
                        `depth@${eventId}-yes`,
                        `depth@${eventId}-no`,
                        `trade@${eventId}-yes`,
                        `trade@${eventId}-no`,
                    ],
                };
                console.log('📤 Sending unsubscribe message:', unsubscribeMessage);
                wsRef.current.send(JSON.stringify(unsubscribeMessage));
                wsRef.current.close();
            }
        };
    }, [eventId]);

    const handleDepthUpdate = (message: DepthUpdateMessage) => {
        // Ensure message.data exists before accessing its properties
        if (!message.data) {
            console.error('❌ Depth update message missing data field:', message);
            return;
        }

        const depthData = message.data;
        const outcome = message.stream.includes('-yes') ? 'yes' : 'no';
        
        console.log(`📈 Updating ${outcome} depth:`, {
            bids: depthData.b?.length || 0,
            asks: depthData.a?.length || 0
        });

        setData(prevData => {
            const newData = { ...prevData };

            if (outcome === 'yes') {
                newData.yesBids = depthData.b || [];
                newData.yesAsks = depthData.a || [];
                
                // Calculate new yes price
                if (newData.yesBids.length > 0 && newData.yesAsks.length > 0) {
                    newData.yesPrice = (parseFloat(newData.yesBids[0][0]) + parseFloat(newData.yesAsks[0][0])) / 2;
                } else if (newData.yesBids.length > 0) {
                    newData.yesPrice = parseFloat(newData.yesBids[0][0]);
                } else if (newData.yesAsks.length > 0) {
                    newData.yesPrice = parseFloat(newData.yesAsks[0][0]);
                }
            } else {
                newData.noBids = depthData.b || [];
                newData.noAsks = depthData.a || [];
                
                // Calculate new no price
                if (newData.noBids.length > 0 && newData.noAsks.length > 0) {
                    newData.noPrice = (parseFloat(newData.noBids[0][0]) + parseFloat(newData.noAsks[0][0])) / 2;
                } else if (newData.noBids.length > 0) {
                    newData.noPrice = parseFloat(newData.noBids[0][0]);
                } else if (newData.noAsks.length > 0) {
                    newData.noPrice = parseFloat(newData.noAsks[0][0]);
                }
            }

            console.log(`✅ Updated ${outcome} price:`, outcome === 'yes' ? newData.yesPrice : newData.noPrice);
            return newData;
        });
    };

    const handleTradeUpdate = (message: TradeAddedMessage) => {
        if (!message.data) {
            console.error('❌ Trade update message missing data field:', message);
            return;
        }

        const tradeData = message.data;
        console.log('💰 Adding new trade:', {
            price: tradeData.p,
            quantity: tradeData.q,
            action: tradeData.action,
            timestamp: tradeData.timestamp
        });

        // Update trades ref and state
        tradesRef.current = [tradeData, ...tradesRef.current.slice(0, 99)];
        setData(prevData => ({ 
            ...prevData, 
            trades: tradesRef.current 
        }));
    };

    const handlePriceHistoryUpdate = (priceData: { eventId: string, pricePoint: PricePoint }) => {
        if (priceData.eventId === eventId) {
            console.log("📈 Adding new price history point:", priceData.pricePoint);

            // Add new price point to existing history
            priceHistoryRef.current = [...priceHistoryRef.current, priceData.pricePoint];

            // Keep only the last 1000 points to prevent memory issues
            if (priceHistoryRef.current.length > 1000) {
                priceHistoryRef.current = priceHistoryRef.current.slice(-1000);
            }

            setData(prevData => ({
                ...prevData,
                priceHistory: priceHistoryRef.current,
                yesPrice: priceData.pricePoint.yesPrice,
                noPrice: priceData.pricePoint.noPrice,
            }));
        }
    };

    return {
        ...data,
        isInitialDataLoaded,
        isConnected
    };
};