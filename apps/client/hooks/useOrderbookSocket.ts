// apps/client/hooks/useOrderbookSocket.ts
import { useEffect, useState, useRef } from 'react';
import { WsMessage, DepthUpdateMessage, TradeAddedMessage, ORDERBOOK_SNAPSHOT } from '@trade/types';

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

    useEffect(() => {
        if (!eventId) return;

        const ws = new WebSocket(process.env.NEXT_PUBLIC_WSS_URL || 'ws://localhost:8080');
        wsRef.current = ws;

        ws.onopen = () => {
            console.log(`Connected to WebSocket for event ${eventId}`);
            
            // FIXED: Send message in the format the server expects
            const subscribeMessage = {
                method: "subscribe_orderbook",
                events: [
                    `depth@${eventId}-yes`,
                    `depth@${eventId}-no`,
                    `trade@${eventId}-yes`,
                    `trade@${eventId}-no`,
                ],
            };
            ws.send(JSON.stringify(subscribeMessage));
        };

        ws.onmessage = (event) => {
            try {
                const message: WsMessage = JSON.parse(event.data);

                // Handle ORDERBOOK_SNAPSHOT messages
                if ('type' in message && message.type === ORDERBOOK_SNAPSHOT) {
                    const snapshot = message.payload;
                    tradesRef.current = snapshot.trades;
                    priceHistoryRef.current = [];
                    
                    if (snapshot.yesPrice > 0 || snapshot.noPrice > 0) {
                        priceHistoryRef.current.push({
                            timestamp: Date.now(),
                            yesPrice: snapshot.yesPrice,
                            noPrice: snapshot.noPrice,
                        });
                    }

                    setData(prevData => ({
                        ...prevData,
                        yesBids: snapshot.yesBids,
                        yesAsks: snapshot.yesAsks,
                        noBids: snapshot.noBids,
                        noAsks: snapshot.noAsks,
                        trades: snapshot.trades,
                        yesPrice: snapshot.yesPrice,
                        noPrice: snapshot.noPrice,
                        priceHistory: priceHistoryRef.current,
                    }));
                    console.log("Received initial orderbook snapshot:", snapshot);
                }
                // Handle stream messages (depth updates, trades)
                else if ('stream' in message) {
                    if (message.stream.startsWith('depth@')) {
                        const depthData = (message as DepthUpdateMessage).data;
                        const outcome = message.stream.includes('-yes') ? 'yes' : 'no';

                        setData(prevData => {
                            const newData = { ...prevData };
                            let currentYesPrice = prevData.yesPrice;
                            let currentNoPrice = prevData.noPrice;

                            if (outcome === 'yes') {
                                newData.yesBids = depthData.b || [];
                                newData.yesAsks = depthData.a || [];
                                if (newData.yesBids.length > 0 && newData.yesAsks.length > 0) {
                                    currentYesPrice = (parseFloat(newData.yesBids[0][0]) + parseFloat(newData.yesAsks[0][0])) / 2;
                                } else if (newData.yesBids.length > 0) {
                                    currentYesPrice = parseFloat(newData.yesBids[0][0]);
                                } else if (newData.yesAsks.length > 0) {
                                    currentYesPrice = parseFloat(newData.yesAsks[0][0]);
                                }
                                newData.yesPrice = currentYesPrice;
                            } else {
                                newData.noBids = depthData.b || [];
                                newData.noAsks = depthData.a || [];
                                if (newData.noBids.length > 0 && newData.noAsks.length > 0) {
                                    currentNoPrice = (parseFloat(newData.noBids[0][0]) + parseFloat(newData.noAsks[0][0])) / 2;
                                } else if (newData.noBids.length > 0) {
                                    currentNoPrice = parseFloat(newData.noBids[0][0]);
                                } else if (newData.noAsks.length > 0) {
                                    currentNoPrice = parseFloat(newData.noAsks[0][0]);
                                }
                                newData.noPrice = currentNoPrice;
                            }

                            // Update price history
                            const lastPricePoint = priceHistoryRef.current[priceHistoryRef.current.length - 1];
                            const now = Date.now();
                            const PRICE_UPDATE_THRESHOLD = 0.1;
                            const TIME_UPDATE_INTERVAL = 5000;
                            
                            if (!lastPricePoint ||
                                Math.abs(currentYesPrice - lastPricePoint.yesPrice) >= PRICE_UPDATE_THRESHOLD ||
                                Math.abs(currentNoPrice - lastPricePoint.noPrice) >= PRICE_UPDATE_THRESHOLD ||
                                (now - lastPricePoint.timestamp) >= TIME_UPDATE_INTERVAL) {
                                priceHistoryRef.current = [...priceHistoryRef.current, { 
                                    timestamp: now, 
                                    yesPrice: currentYesPrice, 
                                    noPrice: currentNoPrice 
                                }];

                                if (priceHistoryRef.current.length > 100) {
                                    priceHistoryRef.current = priceHistoryRef.current.slice(priceHistoryRef.current.length - 100);
                                }
                            }
                            newData.priceHistory = priceHistoryRef.current;

                            return newData;
                        });
                    } else if (message.stream.startsWith('trade@')) {
                        const tradeData = (message as TradeAddedMessage).data;
                        tradesRef.current = [tradeData, ...tradesRef.current.slice(0, 99)];
                        setData(prevData => ({ ...prevData, trades: tradesRef.current }));
                    }
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        ws.onclose = () => {
            console.log(`Disconnected from WebSocket for event ${eventId}`);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
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
                wsRef.current.send(JSON.stringify(unsubscribeMessage));
                wsRef.current.close();
            }
        };
    }, [eventId]);

    return data;
};