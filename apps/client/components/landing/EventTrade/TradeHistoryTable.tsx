// apps/client/components/TradeHistoryTable.tsx
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TradeAddedMessage } from '@trade/types';

interface TradeHistoryTableProps {
  trades: TradeAddedMessage['data'][];
}

export const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({ trades }) => {
  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2">Trade History</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Price</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="text-right">Side</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.length > 0 ? (
            trades.map((trade, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{trade.p}</TableCell>
                <TableCell>{trade.q}</TableCell>
                <TableCell>{new Date(trade.t).toLocaleTimeString()}</TableCell>
                <TableCell className="text-right">
                  {trade.m ? 'Buy' : 'Sell'}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No recent trades
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
