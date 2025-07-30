"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Loader2, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { placeOrder } from "@/actions/Order/placeOrder";
import { TEvent, orderType, sides } from "@trade/types";

// Define the form schema using Zod
const formSchema = z.object({
  quantity: z.coerce
    .number()
    .min(1, { message: "Quantity must be at least 1." })
    .int({ message: "Quantity must be a whole number." }),
  price: z.coerce
    .number()
    .min(0.01, { message: "Price must be positive." })
    .max(100, { message: "Price cannot exceed 100." }),
});

interface IntegratedOrderFormProps {
  event: TEvent;
  currentYesPrice: number;
  currentNoPrice: number;
}

export const IntegratedOrderForm: React.FC<IntegratedOrderFormProps> = ({
  event,
  currentYesPrice,
  currentNoPrice,
}) => {
  const { data: session } = useSession();
  const [selectedAction, setSelectedAction] = useState<orderType>(orderType.BUY);
  const [selectedOutcome, setSelectedOutcome] = useState<sides>(sides.YES);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      price: selectedOutcome === sides.YES ? currentYesPrice : currentNoPrice,
    },
  });

  // Update default price when outcome changes
  React.useEffect(() => {
    form.setValue("price", selectedOutcome === sides.YES ? currentYesPrice : currentNoPrice);
  }, [selectedOutcome, currentYesPrice, currentNoPrice, form]);

  const { mutate, isPending } = useMutation({
    mutationFn: placeOrder,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        form.reset({
          quantity: 1,
          price: selectedOutcome === sides.YES ? currentYesPrice : currentNoPrice,
        });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      console.error("Order placement error:", error);
      toast.error("Failed to place order. Please try again.");
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to place an order.");
      return;
    }

    mutate({
      eventId: event.id,
      price: values.price,
      quantity: values.quantity,
      action: selectedAction,
      outcome: selectedOutcome,
    });
  };

  // Get button styles for the main action button
  const getMainButtonStyles = () => {
    if (selectedAction === orderType.BUY) {
      return "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 border-0";
    } else {
      return "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 border-0";
    }
  };

  const getMainButtonText = () => {
    const action = selectedAction === orderType.BUY ? "Buy" : "Sell";
    const outcome = selectedOutcome.toUpperCase();
    return `${action} ${outcome}`;
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-slate-700/50 p-6 rounded-2xl shadow-2xl">
      {/* Header with icon */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
          <DollarSign className="w-5 h-5 text-cyan-400" />
        </div>
        <h3 className="text-xl font-bold text-white">Place Order</h3>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Buy/Sell Toggle - Enhanced with gradients and shadows */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-800/50 rounded-xl border border-slate-600/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedAction(orderType.BUY)}
              className={`py-3 font-semibold transition-all duration-300 border-0 ${
                selectedAction === orderType.BUY
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25 hover:from-green-600 hover:to-emerald-700"
                  : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/70 hover:text-white"
              }`}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Buy
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedAction(orderType.SELL)}
              className={`py-3 font-semibold transition-all duration-300 border-0 ${
                selectedAction === orderType.SELL
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25 hover:from-red-600 hover:to-rose-700"
                  : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/70 hover:text-white"
              }`}
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Sell
            </Button>
          </div>

          {/* Yes/No Toggle - Enhanced with better colors and effects */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-800/50 rounded-xl border border-slate-600/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedOutcome(sides.YES)}
              className={`py-3 font-semibold transition-all duration-300 border-0 ${
                selectedOutcome === sides.YES
                  ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-green-700"
                  : "bg-slate-700/50 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30"
              }`}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedOutcome(sides.NO)}
              className={`py-3 font-semibold transition-all duration-300 border-0 ${
                selectedOutcome === sides.NO
                  ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-600 hover:to-purple-700"
                  : "bg-slate-700/50 text-slate-300 hover:bg-violet-500/20 hover:text-violet-300 hover:border-violet-500/30"
              }`}
            >
              No
            </Button>
          </div>

          {/* Quantity Input - Enhanced styling */}
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-300 font-medium">Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter quantity"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? "" : Number(value));
                    }}
                    className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 rounded-lg py-3"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          {/* Price Input - Enhanced styling */}
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-300 font-medium">Price (₹)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter price"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? "" : Number(value));
                    }}
                    className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 rounded-lg py-3"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          {/* Total cost calculation - Enhanced with glow effect */}
          {form.watch("quantity") && form.watch("price") && (
            <div className="p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl border border-slate-600/30 backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Total Cost:</span>
                <span className="font-bold text-xl text-white">
                  ₹{(form.watch("quantity") * form.watch("price")).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Main Action Button - Enhanced with better gradients */}
          <Button 
            type="submit" 
            className={`w-full py-4 text-lg font-bold transition-all duration-300 hover:transform hover:scale-[1.02] ${getMainButtonStyles()}`}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              getMainButtonText()
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};