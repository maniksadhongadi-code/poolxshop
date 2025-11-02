"use client";

import { useMemo, useState, useEffect } from "react";
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
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, writeBatch } from "firebase/firestore";
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login";

export default function Home() {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [view, setView] = useState<"active" | "pending">("active");
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const activeCustomersRef = useMemoFirebase(() => firestore ? collection(firestore, 'active_customers') : null, [firestore]);
  const pendingCustomersRef = useMemoFirebase(() => firestore ? collection(firestore, 'pending_customers') : null, [firestore]);

  const { data: activeCustomers, isLoading: isActiveLoading } = useCollection<Customer>(activeCustomersRef);
  const { data: pendingCustomers, isLoading: isPendingLoading } = useCollection<Customer>(pendingCustomersRef);

  // Sign in user anonymously if not logged in
  useEffect(() => {
    if (auth && !isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);

  const handleAddCustomer = (newCustomer: { name: string; email: string; phone: string }) => {
    if (!user || !firestore || !pendingCustomersRef) {
      toast({ title: "Error", description: "You must be logged in to add a customer.", variant: "destructive" });
      return;
    }
    const customerData: Omit<Customer, 'id' | 'status'> = {
      name: newCustomer.name,
      email: newCustomer.email,
      phoneNumber: newCustomer.phone,
    };
    // Firestore will auto-generate an ID
    addDocumentNonBlocking(pendingCustomersRef, {...customerData, status: 'pending'});
    toast({
      title: "Customer Added",
      description: `${newCustomer.name} has been added to the pending list.`,
    });
  };

  const handleDeleteCustomer = (customerId: string) => {
    if (!firestore) return;
    const customerToDelete = pendingCustomers?.find(c => c.id === customerId) || activeCustomers?.find(c => c.id === customerId);
    if (customerToDelete) {
        if (customerToDelete.status === 'pending') {
            deleteDocumentNonBlocking(doc(firestore, "pending_customers", customerId));
        } else {
            deleteDocumentNonBlocking(doc(firestore, "active_customers", customerId));
        }
      
      toast({
        title: "Customer Deleted",
        description: `${customerToDelete.name} has been deleted.`,
        variant: "destructive",
      });
    }
  };

  const handleSwitchCustomer = async (customer: Customer, from: "pending" | "active") => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    if (from === "pending") {
      const fromRef = doc(firestore, "pending_customers", customer.id);
      const toRef = doc(firestore, "active_customers", customer.id);
      batch.delete(fromRef);
      batch.set(toRef, { ...customer, status: 'active' });
      toast({
        title: "Customer Activated",
        description: `${customer.name} has been moved to the active list.`,
      });
    } else {
      const fromRef = doc(firestore, "active_customers", customer.id);
      const toRef = doc(firestore, "pending_customers", customer.id);
      batch.delete(fromRef);
      batch.set(toRef, { ...customer, status: 'pending' });
      toast({
        title: "Customer Moved to Pending",
        description: `${customer.name} has been moved to the pending list.`,
      });
    }
    await batch.commit().catch(error => {
       console.error("Error switching customer:", error);
       toast({
         title: "Error switching customer",
         description: "Could not update customer status.",
         variant: "destructive",
       });
    });
  };
  
  const customersToShow = view === 'active' ? activeCustomers : pendingCustomers;
  const title = view === 'active' ? "Active Customers" : "Pending Customers";
  const isLoading = (view === 'active' ? isActiveLoading : isPendingLoading) || isUserLoading;

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
            {isLoading && <p>Loading...</p>}
            {!isLoading && customersToShow && customersToShow.length > 0 ? (
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
              !isLoading && (
                <div className="flex items-center justify-center h-48 rounded-lg border-2 border-dashed border-border text-muted-foreground p-8">
                  <p>No {view} customers.</p>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
