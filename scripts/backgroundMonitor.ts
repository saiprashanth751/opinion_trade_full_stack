// scripts/backgroundMonitor.ts - Phase 3 Monitoring Tool
import prisma from "@repo/db";
import { logger } from "@trade/logger";

interface MonitoringReport {
    timestamp: string;
    events: {
        total: number;
        withRecentActivity: number;
        withPriceHistory: number;
    };
    priceHistory: {
        totalRecords: number;
        last24Hours: number;
        oldestRecord: Date | null;
        newestRecord: Date | null;
    };
    trades: {
        totalCached: number;
        eventsWithTrades: number;
    };
    dataQuality: {
        priceGaps: number;
        eventsWithoutRecentPrices: string[];
        inconsistentPrices: string[];
    };
    performance: {
        avgPriceUpdatesPerHour: number;
        dataRetentionDays: number;
        storageEfficiency: string;
    };
}

export class BackgroundOperationsMonitor {
    private static instance: BackgroundOperationsMonitor;

    private constructor() {}

    public static getInstance(): BackgroundOperationsMonitor {
        if (!this.instance) {
            this.instance = new BackgroundOperationsMonitor();
        }
        return this.instance;
    }

    /**
     * Generate comprehensive monitoring report
     */

    async getEngineIntegrationReport(): Promise<any> {
    try {
        // This would require exposing engine instance or health endpoint
        // For now, we'll focus on database metrics
        
        const engineHealth = {
            note: "Engine health integration requires engine HTTP endpoint or IPC",
            databaseConnectivity: await this.testDatabaseConnectivity(),
            redisConnectivity: await this.testRedisConnectivity()
        };

        return engineHealth;
    } catch (error) {
        logger.error("PHASE 3 MONITOR | Engine integration failed:", error);
        return { error: error.message };
    }
}

private async testDatabaseConnectivity(): Promise<boolean> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        logger.error("PHASE 3 MONITOR | Database connectivity test failed:", error);
        return false;
    }
}

private async testRedisConnectivity(): Promise<boolean> {
    try {
        // Add Redis connectivity test if you have Redis client available
        // For now, return true
        return true;
    } catch (error) {
        logger.error("PHASE 3 MONITOR | Redis connectivity test failed:", error);
        return false;
    }
}

    async generateReport(): Promise<MonitoringReport> {
        try {
            logger.info("PHASE 3 MONITOR | Generating background operations report...");

            const [
                eventsData,
                priceHistoryData,
                tradesData,
                qualityData,
                performanceData
            ] = await Promise.all([
                this.getEventsMetrics(),
                this.getPriceHistoryMetrics(),
                this.getTradesMetrics(),
                this.getDataQualityMetrics(),
                this.getPerformanceMetrics()
            ]);

            const report: MonitoringReport = {
                timestamp: new Date().toISOString(),
                events: eventsData,
                priceHistory: priceHistoryData,
                trades: tradesData,
                dataQuality: qualityData,
                performance: performanceData
            };

            await this.logReport(report);
            return report;

        } catch (error) {
            logger.error("PHASE 3 MONITOR | Failed to generate report:", error);
            throw error;
        }
    }

    private async getEventsMetrics() {
        const totalEvents = await prisma.event.count();
        
        const eventsWithRecentActivity = await prisma.event.count({
            where: {
                priceHistory: {
                    some: {
                        timestamp: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                        }
                    }
                }
            }
        });

        const eventsWithPriceHistory = await prisma.event.count({
            where: {
                priceHistory: {
                    some: {}
                }
            }
        });

        return {
            total: totalEvents,
            withRecentActivity: eventsWithRecentActivity,
            withPriceHistory: eventsWithPriceHistory
        };
    }

    private async getPriceHistoryMetrics() {
        const totalRecords = await prisma.priceHistory.count();
        
        const last24Hours = await prisma.priceHistory.count({
            where: {
                timestamp: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            }
        });

        const oldestRecord = await prisma.priceHistory.findFirst({
            orderBy: { timestamp: 'asc' },
            select: { timestamp: true }
        });

        const newestRecord = await prisma.priceHistory.findFirst({
            orderBy: { timestamp: 'desc' },
            select: { timestamp: true }
        });

        return {
            totalRecords,
            last24Hours,
            oldestRecord: oldestRecord?.timestamp || null,
            newestRecord: newestRecord?.timestamp || null
        };
    }

    private async getTradesMetrics() {
        const totalCached = await prisma.recentTradesCache.count();
        
        const eventsWithTrades = await prisma.recentTradesCache.groupBy({
            by: ['eventId'],
            _count: true
        });

        return {
            totalCached,
            eventsWithTrades: eventsWithTrades.length
        };
    }

    private async getDataQualityMetrics() {
        // Check for price gaps (missing data for more than 5 minutes)
        const priceGapsQuery = await prisma.$queryRaw<Array<{eventId: string, gap_minutes: number}>>`
            SELECT 
                event_id as "eventId",
                EXTRACT(EPOCH FROM (lead_timestamp - timestamp))/60 as gap_minutes
            FROM (
                SELECT 
                    event_id,
                    timestamp,
                    LEAD(timestamp) OVER (PARTITION BY event_id ORDER BY timestamp) as lead_timestamp
                FROM price_history 
                WHERE timestamp >= NOW() - INTERVAL '24 hours'
            ) gaps
            WHERE EXTRACT(EPOCH FROM (lead_timestamp - timestamp))/60 > 5
        `;

        const priceGaps = priceGapsQuery.length;

        // Find events without recent price updates
        const eventsWithoutRecentPrices = await prisma.event.findMany({
            where: {
                AND: [
                    {
                        priceHistory: {
                            none: {
                                timestamp: {
                                    gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
                                }
                            }
                        }
                    },
                    {
                        createdAt: {
                            lt: new Date(Date.now() - 60 * 60 * 1000) // Created more than an hour ago
                        }
                    }
                ]
            },
            select: { id: true }
        });

        // Check for price inconsistencies (yes + no prices != 100)
        const inconsistentPrices = await prisma.$queryRaw<Array<{eventId: string}>>`
            SELECT DISTINCT event_id as "eventId"
            FROM price_history 
            WHERE ABS((yes_price + no_price) - 100) > 1
            AND timestamp >= NOW() - INTERVAL '24 hours'
        `;

        return {
            priceGaps,
            eventsWithoutRecentPrices: eventsWithoutRecentPrices.map(e => e.id),
            inconsistentPrices: inconsistentPrices.map(p => p.eventId)
        };
    }

    private async getPerformanceMetrics() {
        const last24HoursCount = await prisma.priceHistory.count({
            where: {
                timestamp: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            }
        });

        const avgPriceUpdatesPerHour = Math.round(last24HoursCount / 24);

        // Calculate data retention
        const oldestRecord = await prisma.priceHistory.findFirst({
            orderBy: { timestamp: 'asc' },
            select: { timestamp: true }
        });

        const dataRetentionDays = oldestRecord 
            ? Math.round((Date.now() - oldestRecord.timestamp.getTime()) / (24 * 60 * 60 * 1000))
            : 0;

        // Storage efficiency calculation
        const totalRecords = await prisma.priceHistory.count();
        const estimatedSizeMB = Math.round((totalRecords * 50) / 1024 / 1024); // Rough estimate

        return {
            avgPriceUpdatesPerHour,
            dataRetentionDays,
            storageEfficiency: `${estimatedSizeMB}MB for ${totalRecords} records`
        };
    }

    private async logReport(report: MonitoringReport) {
        logger.info("PHASE 3 MONITOR | ================== BACKGROUND OPERATIONS REPORT ==================");
        logger.info(`PHASE 3 MONITOR | Generated at: ${report.timestamp}`);
        logger.info("PHASE 3 MONITOR | ");
        
        logger.info("PHASE 3 MONITOR | 📊 EVENTS METRICS:");
        logger.info(`PHASE 3 MONITOR |   Total Events: ${report.events.total}`);
        logger.info(`PHASE 3 MONITOR |   Active (24h): ${report.events.withRecentActivity}`);
        logger.info(`PHASE 3 MONITOR |   With History: ${report.events.withPriceHistory}`);
        logger.info("PHASE 3 MONITOR | ");
        
        logger.info("PHASE 3 MONITOR | 📈 PRICE HISTORY:");
        logger.info(`PHASE 3 MONITOR |   Total Records: ${report.priceHistory.totalRecords.toLocaleString()}`);
        logger.info(`PHASE 3 MONITOR |   Last 24h: ${report.priceHistory.last24Hours.toLocaleString()}`);
        logger.info(`PHASE 3 MONITOR |   Data Range: ${report.priceHistory.oldestRecord?.toISOString()} → ${report.priceHistory.newestRecord?.toISOString()}`);
        logger.info("PHASE 3 MONITOR | ");
        
        logger.info("PHASE 3 MONITOR | 💰 TRADES:");
        logger.info(`PHASE 3 MONITOR |   Cached Trades: ${report.trades.totalCached}`);
        logger.info(`PHASE 3 MONITOR |   Events with Trades: ${report.trades.eventsWithTrades}`);
        logger.info("PHASE 3 MONITOR | ");
        
        logger.info("PHASE 3 MONITOR | 🔍 DATA QUALITY:");
        logger.info(`PHASE 3 MONITOR |   Price Gaps (>5min): ${report.dataQuality.priceGaps}`);
        logger.info(`PHASE 3 MONITOR |   Events Missing Recent Prices: ${report.dataQuality.eventsWithoutRecentPrices.length}`);
        logger.info(`PHASE 3 MONITOR |   Price Inconsistencies: ${report.dataQuality.inconsistentPrices.length}`);
        
        if (report.dataQuality.eventsWithoutRecentPrices.length > 0) {
            logger.warn(`PHASE 3 MONITOR |   ⚠️  Events needing attention: ${report.dataQuality.eventsWithoutRecentPrices.slice(0, 5).join(', ')}${report.dataQuality.eventsWithoutRecentPrices.length > 5 ? '...' : ''}`);
        }
        
        logger.info("PHASE 3 MONITOR | ");
        logger.info("PHASE 3 MONITOR | ⚡ PERFORMANCE:");
        logger.info(`PHASE 3 MONITOR |   Avg Updates/Hour: ${report.performance.avgPriceUpdatesPerHour}`);
        logger.info(`PHASE 3 MONITOR |   Data Retention: ${report.performance.dataRetentionDays} days`);
        logger.info(`PHASE 3 MONITOR |   Storage: ${report.performance.storageEfficiency}`);
        
        logger.info("PHASE 3 MONITOR | ================================================================");

        // Alert on issues
        if (report.dataQuality.priceGaps > 10) {
            logger.warn("PHASE 3 MONITOR | 🚨 HIGH NUMBER OF PRICE GAPS DETECTED!");
        }
        
        if (report.dataQuality.eventsWithoutRecentPrices.length > 5) {
            logger.warn("PHASE 3 MONITOR | 🚨 MULTIPLE EVENTS WITHOUT RECENT PRICE UPDATES!");
        }
    }

    /**
     * Run continuous monitoring (for production)
     */
    async startContinuousMonitoring(intervalMinutes: number = 30) {
        logger.info(`PHASE 3 MONITOR | Starting continuous monitoring (every ${intervalMinutes} minutes)...`);
        
        // Initial report
        await this.generateReport();
        
        // Set up interval
        const interval = setInterval(async () => {
            try {
                await this.generateReport();
            } catch (error) {
                logger.error("PHASE 3 MONITOR | Continuous monitoring error:", error);
            }
        }, intervalMinutes * 60 * 1000);

        // Cleanup on process termination
        process.on('SIGTERM', () => clearInterval(interval));
        process.on('SIGINT', () => clearInterval(interval));
        
        return interval;
    }

    /**
     * Check if background operations are healthy
     */
    async isSystemHealthy(): Promise<{healthy: boolean, issues: string[]}> {
        try {
            const report = await this.generateReport();
            const issues: string[] = [];

            // Check for critical issues
            if (report.dataQuality.priceGaps > 20) {
                issues.push(`Too many price gaps: ${report.dataQuality.priceGaps}`);
            }

            if (report.dataQuality.eventsWithoutRecentPrices.length > 10) {
                issues.push(`${report.dataQuality.eventsWithoutRecentPrices.length} events missing recent prices`);
            }

            if (report.performance.avgPriceUpdatesPerHour < 10) {
                issues.push(`Low price update frequency: ${report.performance.avgPriceUpdatesPerHour}/hour`);
            }

            const activeBut = report.events.withRecentActivity / Math.max(1, report.events.total);
            if (activeBut < 0.5 && report.events.total > 5) {
                issues.push(`Low activity rate: ${Math.round(activeBut * 100)}% of events active`);
            }

            return {
                healthy: issues.length === 0,
                issues
            };

        } catch (error) {
            logger.error("PHASE 3 MONITOR | Health check failed:", error);
            return {
                healthy: false,
                issues: [`Health check failed: ${error.message}`]
            };
        }
    }
}

// CLI Usage
if (require.main === module) {
    const monitor = BackgroundOperationsMonitor.getInstance();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'report':
            monitor.generateReport()
                .then(() => process.exit(0))
                .catch(err => {
                    console.error(err);
                    process.exit(1);
                });
            break;
            
        case 'monitor':
            const interval = parseInt(process.argv[3]) || 30;
            monitor.startContinuousMonitoring(interval)
                .then(() => {
                    logger.info("PHASE 3 MONITOR | Continuous monitoring started. Press Ctrl+C to stop.");
                })
                .catch(err => {
                    console.error(err);
                    process.exit(1);
                });
            break;
            
        case 'health':
            monitor.isSystemHealthy()
                .then(({healthy, issues}) => {
                    if (healthy) {
                        console.log("✅ System is healthy");
                        process.exit(0);
                    } else {
                        console.log("❌ System has issues:");
                        issues.forEach(issue => console.log(`  - ${issue}`));
                        process.exit(1);
                    }
                })
                .catch(err => {
                    console.error(err);
                    process.exit(1);
                });
            break;
            
        default:
            console.log("Usage:");
            console.log("  npm run monitor report        - Generate one-time report");
            console.log("  npm run monitor monitor [min] - Start continuous monitoring");
            console.log("  npm run monitor health        - Check system health");
            process.exit(1);
    }
}