"use client";

import { useState } from "react";
import type { Customer } from "@/types";
import { AddCustomerForm } from "@/components/add-customer-form";
import { CustomerCard } from "@/components/customer-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserPlus, MoreVertical, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const initialPendingCustomers: Customer[] = [
  { id: 'pending-1', name: 'Elara Vance', email: 'elara.vance@email.co', phone: '111-111-1111' },
  { id: 'pending-2', name: 'Finn Darby', email: 'finn.darby@email.co', phone: '222-222-2222' },
];

const initialActiveCustomers: Customer[] = [
  { id: 'active-1', name: 'Liam Hollis', email: 'liam.hollis@email.co', phone: '333-333-3333' },
];


export default function Home() {
  const [pendingCustomers, setPendingCustomers] = useState<Customer[]>(initialPendingCustomers);
  const [activeCustomers, setActiveCustomers] = useState<Customer[]>(initialActiveCustomers);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [view, setView] = useState<"active" | "pending">("active");
  const { toast } = useToast();

  const handleAddCustomer = (newCustomer: { name: string; email: string; phone: string }) => {
    setPendingCustomers(prev => [...prev, { id: crypto.randomUUID(), ...newCustomer }]);
    toast({
      title: "Customer Added",
      description: `${newCustomer.name} has been added to the pending list.`,
    });
  };

  const handleDeleteCustomer = (customerId: string) => {
    const customerToDelete = pendingCustomers.find(c => c.id === customerId);
    setPendingCustomers(prev => prev.filter(c => c.id !== customerId));
    setActiveCustomers(prev => prev.filter(c => c.id !== customerId));
    if (customerToDelete) {
      toast({
        title: "Customer Deleted",
        description: `${customerToDelete.name} has been deleted.`,
        variant: "destructive",
      });
    }
  };

  const handleSwitchCustomer = (customer: Customer, from: "pending" | "active") => {
    if (from === "pending") {
      setPendingCustomers(prev => prev.filter(c => c.id !== customer.id));
      setActiveCustomers(prev => [customer, ...prev]);
      toast({
        title: "Customer Activated",
        description: `${customer.name} has been moved to the active list.`,
      });
    } else {
      setActiveCustomers(prev => prev.filter(c => c.id !== customer.id));
      setPendingCustomers(prev => [customer, ...prev]);
       toast({
        title: "Customer Moved to Pending",
        description: `${customer.name} has been moved to the pending list.`,
      });
    }
  };
  
  const customersToShow = view === 'active' ? activeCustomers : pendingCustomers;
  const title = view === 'active' ? "Active Customers" : "Pending Customers";

  return (
    <main className="min-h-screen bg-background font-body text-foreground p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-headline font-bold text-primary-foreground bg-primary py-2 px-4 rounded-lg shadow-md">
            Customer Hub
          </h1>
          <div className="flex items-center gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add a New Customer</DialogTitle>
                  <DialogDescription>
                    Enter the customer's details. They will be added to the pending list.
                  </DialogDescription>
                </DialogHeader>
                <AddCustomerForm 
                  onAddCustomer={handleAddCustomer}
                  onFinished={() => setAddDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setView('active')}>
                   {view === 'active' && <Check className="mr-2 h-4 w-4" />}
                   {view !== 'active' && <span className="w-8"></span>}
                  Active Customers
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setView('pending')}>
                  {view === 'pending' && <Check className="mr-2 h-4 w-4" />}
                  {view !== 'pending' && <span className="w-8"></span>}
                  Pending Customers
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <section>
          <h2 className="text-2xl font-semibold mb-4 pb-2 border-b-2 border-primary/50">{title}</h2>
          <div className="space-y-4">
            {customersToShow.length > 0 ? (
              customersToShow.map(customer => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  listType={view}
                  onSwitch={handleSwitchCustomer}
                  onDelete={handleDeleteCustomer}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-48 rounded-lg border-2 border-dashed border-border text-muted-foreground p-8">
                <p>No {view} customers.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
