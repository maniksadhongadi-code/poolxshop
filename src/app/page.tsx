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
import { UserPlus } from "lucide-react";

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

  const handleAddCustomer = (newCustomer: { name: string; email: string; phone: string }) => {
    setPendingCustomers(prev => [...prev, { id: crypto.randomUUID(), ...newCustomer }]);
  };

  const handleDeleteCustomer = (customerId: string) => {
    setPendingCustomers(prev => prev.filter(c => c.id !== customerId));
    setActiveCustomers(prev => prev.filter(c => c.id !== customerId));
  };

  const handleSwitchCustomer = (customer: Customer, from: "pending" | "active") => {
    if (from === "pending") {
      setPendingCustomers(prev => prev.filter(c => c.id !== customer.id));
      setActiveCustomers(prev => [customer, ...prev]);
    } else {
      setActiveCustomers(prev => prev.filter(c => c.id !== customer.id));
      setPendingCustomers(prev => [customer, ...prev]);
    }
  };
  
  return (
    <main className="min-h-screen bg-background font-body text-foreground p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-headline font-bold text-primary-foreground bg-primary py-2 px-4 rounded-lg shadow-md">
            Customer Hub
          </h1>
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
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="flex flex-col">
            <h2 className="text-2xl font-semibold mb-4 pb-2 border-b-2 border-primary/50">Pending Customers</h2>
            <div className="space-y-4 flex-1">
              {pendingCustomers.length > 0 ? (
                pendingCustomers.map(customer => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    listType="pending"
                    onSwitch={handleSwitchCustomer}
                    onDelete={handleDeleteCustomer}
                  />
                ))
              ) : (
                <div className="flex items-center justify-center h-full rounded-lg border-2 border-dashed border-border text-muted-foreground p-8">
                  <p>No pending customers.</p>
                </div>
              )}
            </div>
          </section>

          <section className="flex flex-col">
            <h2 className="text-2xl font-semibold mb-4 pb-2 border-b-2 border-primary/50">Active Customers</h2>
            <div className="space-y-4 flex-1">
              {activeCustomers.length > 0 ? (
                activeCustomers.map(customer => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    listType="active"
                    onSwitch={handleSwitchCustomer}
                    onDelete={handleDeleteCustomer}
                  />
                ))
              ) : (
                <div className="flex items-center justify-center h-full rounded-lg border-2 border-dashed border-border text-muted-foreground p-8">
                  <p>No active customers.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
