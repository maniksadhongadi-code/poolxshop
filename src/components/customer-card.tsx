"use client";

import { useState } from "react";
import type { Customer } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowRightLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

type CustomerCardProps = {
  customer: Customer;
  listType: "pending" | "active";
  onSwitch: (customer: Customer, from: "pending" | "active") => void;
  onDelete?: (customerId: string) => void;
};

const CLICKS_TO_SWITCH = 4;

export function CustomerCard({ customer, listType, onSwitch, onDelete }: CustomerCardProps) {
  const [switchClicks, setSwitchClicks] = useState(0);

  const handleSwitchClick = () => {
    const newClicks = switchClicks + 1;
    if (newClicks >= CLICKS_TO_SWITCH) {
      onSwitch(customer, listType);
      setSwitchClicks(0);
    } else {
      setSwitchClicks(newClicks);
    }
  };
  
  const handleBlur = () => {
    if (switchClicks > 0) {
        setSwitchClicks(0);
    }
  }

  return (
    <Card onBlur={handleBlur} className="transition-shadow duration-300 hover:shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold truncate">{customer.email}</CardTitle>
        <CardDescription>{customer.phone}</CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSwitchClick}
          className="flex-grow"
          aria-live="polite"
        >
          <ArrowRightLeft />
          <span>Switch</span>
          {switchClicks > 0 && <span className="ml-2 font-mono text-muted-foreground">({switchClicks}/{CLICKS_TO_SWITCH})</span>}
        </Button>
        {listType === "pending" && onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" aria-label="Delete customer">
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the customer from the pending list.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(customer.id)} className={buttonVariants({ variant: "destructive" })}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
}
