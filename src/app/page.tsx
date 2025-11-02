
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
import { UserPlus, MoreVertical, Check, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login";
import { PasswordProtection } from "@/components/password-protection";
import * as XLSX from 'xlsx';
import { format } from "date-fns";

export default function Home() {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [view, setView] = useState<"active" | "pending">("active");
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // This effect runs on the client to check for password authentication
  // and initiate anonymous sign-in if needed.
  useEffect(() => {
    // This part should only run on the client after hydration
    const storedAuth = localStorage.getItem("is-authenticated") === "true";
    setIsAuthenticated(storedAuth);

    if (!isUserLoading) {
      // If password is authenticated and there is no user, sign in.
      if (storedAuth && auth && !user) {
        initiateAnonymousSignIn(auth);
      }
      // We are ready to render the UI once the initial user check is complete.
      setIsAuthReady(true);
    }
  }, [isUserLoading, user, auth]);


  // Memoize Firestore references. They will be null until auth is ready and a user exists.
  const activeCustomersRef = useMemoFirebase(() =>
    (isAuthReady && user && firestore) ? collection(firestore, 'active_customers') : null,
    [isAuthReady, user, firestore]
  );
  const pendingCustomersRef = useMemoFirebase(() =>
    (isAuthReady && user && firestore) ? collection(firestore, 'pending_customers') : null,
    [isAuthReady, user, firestore]
  );

  const { data: activeCustomers, isLoading: isActiveLoading } = useCollection<Customer>(activeCustomersRef);
  const { data: pendingCustomers, isLoading: isPendingLoading } = useCollection<Customer>(pendingCustomersRef);

  const handlePasswordAuthenticated = () => {
    localStorage.setItem("is-authenticated", "true");
    setIsAuthenticated(true);
    // After password auth, immediately try to sign in anonymously if there's no user.
    if(auth && !user) {
      initiateAnonymousSignIn(auth);
    }
  }

  const handleAddCustomer = (newCustomer: { name: string; email: string; phone: string }) => {
    if (!user || !firestore || !activeCustomersRef || !pendingCustomersRef) {
      toast({ title: "Error", description: "You must be logged in to add a customer.", variant: "destructive" });
      return;
    }
    
    const customerData = {
      name: newCustomer.name,
      email: newCustomer.email,
      phoneNumber: newCustomer.phone,
      createdAt: serverTimestamp(),
    };
    
    const targetRef = view === 'active' ? activeCustomersRef : pendingCustomersRef;
    const status = view;

    addDocumentNonBlocking(targetRef, {...customerData, status: status});
    toast({
      title: "Customer Added",
      description: `${newCustomer.name} has been added to the ${status} list.`,
    });
    setAddDialogOpen(false);
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
    
    // Preserve the original creation date when switching
    const customerToSwitch = { ...customer };

    if (from === "pending") {
      const fromRef = doc(firestore, "pending_customers", customer.id);
      const toRef = doc(firestore, "active_customers", customer.id);
      batch.delete(fromRef);
      batch.set(toRef, { ...customerToSwitch, status: 'active' });
      toast({
        title: "Customer Activated",
        description: `${customer.name} has been moved to the active list.`,
      });
    } else {
      const fromRef = doc(firestore, "active_customers", customer.id);
      const toRef = doc(firestore, "pending_customers", customer.id);
      batch.delete(fromRef);
      batch.set(toRef, { ...customerToSwitch, status: 'pending' });
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

  const handleDownload = () => {
    const customersToDownload = view === 'active' ? activeCustomers : pendingCustomers;
    if (!customersToDownload || customersToDownload.length === 0) {
      toast({ title: "No Data", description: `There are no ${view} customers to download.`, variant: "destructive" });
      return;
    }

    const dataForSheet = customersToDownload.map(customer => ({
      Name: customer.name,
      // Ensure phone number is treated as a string for the export
      'Mobile Number': String(customer.phoneNumber),
      'Activation Date': customer.createdAt ? format(customer.createdAt.toDate(), 'MMMM d, yyyy') : 'N/A'
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataForSheet, {
      skipHeader: false,
    });
    
    // Set column widths
    worksheet['!cols'] = [
        { wch: 25 }, // Name
        { wch: 20 }, // Mobile Number
        { wch: 20 }  // Activation Date
    ];
    
    const workbook = XLSX.utils.book_new();
    const sheetName = `${view.charAt(0).toUpperCase() + view.slice(1)} Customers`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${sheetName}.xlsx`);

     toast({
      title: "Download Started",
      description: `Your ${view} customer list is downloading.`,
    });
  };
  
  const customersToShow = view === 'active' ? activeCustomers : pendingCustomers;
  const title = view === 'active' ? "Active Customers" : "Pending Customers";
  const isLoading = isUserLoading || (isAuthenticated && (isActiveLoading || isPendingLoading));

  // Render a loading screen until we're sure about the auth state
  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // If not password-authenticated, show the password screen
  if (!isAuthenticated) {
    return <PasswordProtection onAuthenticated={handlePasswordAuthenticated} />;
  }

  return (
    <main className="min-h-screen bg-background font-body text-foreground p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-headline font-bold text-primary-foreground bg-primary py-2 px-4 rounded-lg shadow-md">
            Customer Hub
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download />
              Download List
            </Button>
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
                    Enter the customer's details. They will be added to the {view} list.
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
            {isLoading && <p>Loading customers...</p>}
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

