"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface OrderPlacementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: TEvent;
  initialPrice: number;
  outcome: sides; // "yes" or "no"
}

const formSchema = z.object({
  quantity: z.coerce
    .number()
    .min(1, { message: "Quantity must be at least 1." })
    .int({ message: "Quantity must be a whole number." }),
});

export function OrderPlacementDialog({
  isOpen,
  onClose,
  event,
  initialPrice,
  outcome,
}: OrderPlacementDialogProps) {
  const { data: session } = useSession();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1, 
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: placeOrder,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        form.reset(); 
        onClose();
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
      eventId: event.id, // Use event.id as eventId
      price: initialPrice,
      quantity: values.quantity,
      action: "buy" as orderType, // Assuming all orders from this dialog are 'buy'
      outcome: outcome,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Place Order for {event.title}</DialogTitle>
          <DialogDescription>
            You are placing a {outcome.toUpperCase()} order at ₹{initialPrice}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <FormLabel htmlFor="quantity" className="text-right">
                Quantity
              </FormLabel>
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem className="col-span-3">
                    <FormControl>
                      <Input
                        id="quantity"
                        type="number"
                        {...field}
                        onChange={(e) => {
                          // Ensure the input value is a number
                          const value = e.target.value;
                          field.onChange(value === "" ? "" : Number(value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Place Order"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
