"use client";

import type { Customer } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowRightLeft, MoreVertical, CalendarIcon, ShieldAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { format } from "date-fns";

type CustomerCardProps = {
  customer: Customer;
  listType: "pending" | "active";
  onSwitch: (customer: Customer, from: "pending" | "active") => void;
  onDelete?: (customerId: string) => void;
};

export function CustomerCard({ customer, listType, onSwitch, onDelete }: CustomerCardProps) {
  const switchLabel = listType === "pending" ? "Move to Active" : "Move to Pending";
  
  const formattedDate = customer.createdAt && customer.createdAt.toDate ? format(customer.createdAt.toDate(), "MMMM d, yyyy") : 'Date not available';
  const expiryDate = customer.expiryDate && customer.expiryDate.toDate ? format(customer.expiryDate.toDate(), "MMMM d, yyyy") : 'N/A';

  return (
    <Card className="transition-shadow duration-300 hover:shadow-xl">
      <CardHeader className="pb-4 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg font-semibold truncate">{customer.name}</CardTitle>
          <CardDescription>{customer.email}</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSwitch(customer, listType)}>
              <ArrowRightLeft className="mr-2" />
              <span>{switchLabel}</span>
            </DropdownMenuItem>
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="mr-2" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the customer.
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
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
         <p className="text-sm text-muted-foreground">{customer.phoneNumber}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-2">
         <div className="flex items-center text-xs text-muted-foreground">
            <ShieldAlert className="mr-1.5 h-4 w-4" />
            <span>Expires: {expiryDate}</span>
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          <CalendarIcon className="mr-1.5 h-4 w-4" />
          <span>Added: {formattedDate}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
