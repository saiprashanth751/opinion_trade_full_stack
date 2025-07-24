"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";
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
    .min(0.01, { message: "Price must be positive." }) // Assuming price can be decimal
    .max(100, { message: "Price cannot exceed 100." }), // Assuming price is out of 100
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
  const [selectedAction, setSelectedAction] = useState<orderType>(orderType.BUY); // "buy" or "sell"
  const [selectedOutcome, setSelectedOutcome] = useState<sides>(sides.YES); // "yes" or "no"

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

  return (
    <div className="bg-card p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Place Order</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Buy/Sell Toggle */}
          <div className="flex space-x-2 mb-4">
            <Button
              type="button"
              variant={selectedAction === "buy" ? "default" : "outline"}
              onClick={() => setSelectedAction(orderType.BUY)}
              className="flex-1"
            >
              Buy
            </Button>
            <Button
              type="button"
              variant={selectedAction === "sell" ? "default" : "outline"}
              onClick={() => setSelectedAction(orderType.SELL)}
              className="flex-1"
            >
              Sell
            </Button>
          </div>

          {/* Yes/No Toggle */}
          <div className="flex space-x-2 mb-4">
            <Button
              type="button"
              variant={selectedOutcome === sides.YES ? "default" : "outline"}
              onClick={() => setSelectedOutcome(sides.YES)}
              className="flex-1"
            >
              Yes (₹{currentYesPrice})
            </Button>
            <Button
              type="button"
              variant={selectedOutcome === sides.NO ? "default" : "outline"}
              onClick={() => setSelectedOutcome(sides.NO)}
              className="flex-1"
            >
              No (₹{currentNoPrice})
            </Button>
          </div>

          {/* Quantity Input */}
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter quantity"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? "" : Number(value));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Price Input */}
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01" // Allow decimal prices
                    placeholder="Enter price"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? "" : Number(value));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              `${selectedAction === "buy" ? "Buy" : "Sell"} ${selectedOutcome.toUpperCase()}`
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};
