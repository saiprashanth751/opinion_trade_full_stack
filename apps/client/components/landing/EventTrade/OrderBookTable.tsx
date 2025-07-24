
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrderBookTableProps {
  title: string;
  bids: [string, string][];
  asks: [string, string][];
}

export const OrderBookTable: React.FC<OrderBookTableProps> = ({ title, bids, asks }) => {
  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2">{title} Order Book</h3>
      <div className="grid grid-cols-2 gap-4">
        {/* Bids Table */}
        <div>
          <h4 className="text-md font-medium mb-1">Bids (Buy)</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Price</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bids.length > 0 ? (
                bids.map(([price, quantity], index) => (
                  <TableRow key={index} className="bg-green-50/50 hover:bg-green-100">
                    <TableCell className="font-medium text-green-600">{price}</TableCell>
                    <TableCell className="text-right">{quantity}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                    No bids
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Asks Table */}
        <div>
          <h4 className="text-md font-medium mb-1">Asks (Sell)</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Price</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asks.length > 0 ? (
                asks.map(([price, quantity], index) => (
                  <TableRow key={index} className="bg-red-50/50 hover:bg-red-100">
                    <TableCell className="font-medium text-red-600">{price}</TableCell>
                    <TableCell className="text-right">{quantity}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                    No asks
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
