
"use client";

import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser, useFirebase } from "@/firebase";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login";
import { PasswordProtection } from "@/components/password-protection";
import * as XLSX from 'xlsx';
import { format } from "date-fns";

export default function Home() {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [view, setView] = useState<"one_year" | "one_month" | "pending">("one_year");
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);

  // This effect runs once on the client to check for password authentication status.
  useEffect(() => {
    const storedAuth = localStorage.getItem("is-authenticated") === "true";
    setIsAuthenticated(storedAuth);
    setIsClientReady(true); // Indicate that client-side checks are done.
  }, []);

  const firebaseState = useFirebase();
  
  // This effect handles the anonymous sign-in logic.
  useEffect(() => {
    // Only run if client is ready, password is authenticated, and we have an auth instance.
    if (isClientReady && isAuthenticated && firebaseState?.auth && !firebaseState?.user && !firebaseState?.isUserLoading) {
      initiateAnonymousSignIn(firebaseState.auth);
    }
  }, [isClientReady, isAuthenticated, firebaseState]);

  const { firestore, user } = firebaseState || {};

  // Memoize Firestore references. They will be null until auth is ready and a user exists.
  const oneYearCustomersRef = useMemoFirebase(() =>
    (firestore && user) ? collection(firestore, 'one_year_customers') : null,
    [firestore, user]
  );
  const oneMonthCustomersRef = useMemoFirebase(() =>
    (firestore && user) ? collection(firestore, 'one_month_customers') : null,
    [firestore, user]
  );
  const pendingCustomersRef = useMemoFirebase(() =>
    (firestore && user) ? collection(firestore, 'pending_customers') : null,
    [firestore, user]
  );

  const { data: oneYearCustomers, isLoading: isOneYearLoading } = useCollection<Customer>(oneYearCustomersRef);
  const { data: oneMonthCustomers, isLoading: isOneMonthLoading } = useCollection<Customer>(oneMonthCustomersRef);
  const { data: pendingCustomers, isLoading: isPendingLoading } = useCollection<Customer>(pendingCustomersRef);

  const handlePasswordAuthenticated = () => {
    localStorage.setItem("is-authenticated", "true");
    setIsAuthenticated(true);
  }

  const handleAddCustomer = (newCustomer: { name: string; email: string; phone: string }) => {
    if (!user || !firestore) {
      toast({ title: "Error", description: "Authentication not ready. Please wait a moment.", variant: "destructive" });
      return;
    }
    
    const customerData = {
      name: newCustomer.name,
      email: newCustomer.email,
      phoneNumber: newCustomer.phone,
      createdAt: serverTimestamp(),
    };
    
    const status = view;
    let targetRef;
    if (status === 'one_year') {
      targetRef = oneYearCustomersRef;
    } else if (status === 'one_month') {
        targetRef = oneMonthCustomersRef;
    } else {
      targetRef = pendingCustomersRef;
    }

    if (!targetRef) {
       toast({ title: "Error", description: "Customer list not available.", variant: "destructive" });
       return;
    }

    addDocumentNonBlocking(targetRef, {...customerData, status: status});
    toast({
      title: "Customer Added",
      description: `${newCustomer.name} has been added to the ${status.replace('_', ' ')} list.`,
    });
    setAddDialogOpen(false);
  };

  const handleDeleteCustomer = (customerId: string, currentStatus: "one_year" | "one_month" | "pending") => {
    if (!firestore) return;
    
    let docRef;
    if (currentStatus === 'one_year') {
      docRef = doc(firestore, "one_year_customers", customerId);
    } else if (currentStatus === 'one_month') {
        docRef = doc(firestore, "one_month_customers", customerId);
    } else {
      docRef = doc(firestore, "pending_customers", customerId);
    }
    
    deleteDocumentNonBlocking(docRef);
    
    toast({
      title: "Customer Deleted",
      description: `Customer has been deleted.`,
      variant: "destructive",
    });
  };
  
  const handleSwitchCustomer = async (customer: Customer, to: "one_year" | "one_month" | "pending") => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const from = customer.status as "one_year" | "one_month" | "pending";

    if (from === to) return;

    let fromRef;
    if (from === 'one_year') {
      fromRef = doc(firestore, 'one_year_customers', customer.id);
    } else if (from === 'one_month') {
      fromRef = doc(firestore, 'one_month_customers', customer.id);
    } else {
      fromRef = doc(firestore, 'pending_customers', customer.id);
    }
    
    let toRef;
    if (to === 'one_year') {
      toRef = doc(firestore, 'one_year_customers', customer.id);
    } else if (to === 'one_month') {
      toRef = doc(firestore, 'one_month_customers', customer.id);
    } else {
      toRef = doc(firestore, 'pending_customers', customer.id);
    }

    batch.delete(fromRef);
    batch.set(toRef, { ...customer, status: to });

    await batch.commit().catch(error => {
       console.error("Error switching customer:", error);
       toast({
         title: "Error switching customer",
         description: "Could not update customer status.",
         variant: "destructive",
       });
    });

    toast({
        title: "Customer Moved",
        description: `${customer.name} moved to ${to.replace('_', ' ')} list.`,
      });
  };


  const handleDownload = () => {
    let customersToDownload: Customer[] | null | undefined;
    if (view === 'one_year') {
        customersToDownload = oneYearCustomers;
    } else if (view === 'one_month') {
        customersToDownload = oneMonthCustomers;
    } else {
        customersToDownload = pendingCustomers;
    }

    if (!customersToDownload || customersToDownload.length === 0) {
      toast({ title: "No Data", description: `There are no ${view.replace('_', ' ')} customers to download.`, variant: "destructive" });
      return;
    }

    const dataForSheet = customersToDownload.map(customer => ({
      Name: customer.name,
      'Mobile Number': String(customer.phoneNumber), // Ensure phone number is a string
      'Activation Date': customer.createdAt ? format(customer.createdAt.toDate(), 'MMMM d, yyyy') : 'N/A'
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataForSheet, {
      skipHeader: false,
    });
    
    worksheet['!cols'] = [
        { wch: 25 }, // Name
        { wch: 20 }, // Mobile Number
        { wch: 20 }  // Activation Date
    ];
    
    const workbook = XLSX.utils.book_new();
    const sheetName = `${view.charAt(0).toUpperCase() + view.slice(1).replace('_', ' ')} Customers`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${sheetName}.xlsx`);

     toast({
      title: "Download Started",
      description: `Your ${view.replace('_', ' ')} customer list is downloading.`,
    });
  };
  
  let customersToShow: Customer[] | null | undefined;
  let title: string;
  let isLoading: boolean;

    if (view === 'one_year') {
        customersToShow = oneYearCustomers;
        title = "One Year Customers";
        isLoading = isOneYearLoading;
    } else if (view === 'one_month') {
        customersToShow = oneMonthCustomers;
        title = "One Month Customers";
        isLoading = isOneMonthLoading;
    } else {
        customersToShow = pendingCustomers;
        title = "Pending Customers";
        isLoading = isPendingLoading;
    }

  const overallIsLoading = !isClientReady || !firebaseState || firebaseState.isUserLoading || (isAuthenticated && (!user || isLoading));

  if (!isClientReady || !firebaseState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasswordProtection onAuthenticated={handlePasswordAuthenticated} />;
  }

  return (
    <main className="min-h-screen bg-background font-body text-foreground p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-headline font-bold text-primary-foreground bg-primary py-2 px-4 rounded-lg shadow-md">
            Coustomers Hub
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
                    Enter the customer's details. They will be added to the {view.replace('_', ' ')} list.
                  </DialogDescription>
                </DialogHeader>
                <AddCustomerForm 
                  onAddCustomer={handleAddCustomer}
                  onFinished={() => setAddDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <Tabs value={view} onValueChange={(value) => setView(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="one_year">One Year</TabsTrigger>
            <TabsTrigger value="one_month">One Month</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
          </TabsList>
          <TabsContent value="one_year">
            {renderCustomerList(oneYearCustomers, overallIsLoading, "one_year")}
          </TabsContent>
          <TabsContent value="one_month">
            {renderCustomerList(oneMonthCustomers, overallIsLoading, "one_month")}
          </TabsContent>
          <TabsContent value="pending">
            {renderCustomerList(pendingCustomers, overallIsLoading, "pending")}
          </TabsContent>
        </Tabs>

      </div>
    </main>
  );

  function renderCustomerList(customers: Customer[] | null | undefined, loading: boolean, listType: 'one_year' | 'one_month' | 'pending') {
    return (
      <section>
        <div className="space-y-4 pt-4">
          {loading && <p>Loading customers...</p>}
          {!loading && customers && customers.length > 0 ? (
            customers.map(customer => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onSwitch={handleSwitchCustomer}
                onDelete={(id) => handleDeleteCustomer(id, listType)}
              />
            ))
          ) : (
            !loading && (
              <div className="flex items-center justify-center h-48 rounded-lg border-2 border-dashed border-border text-muted-foreground p-8">
                <p>No {listType.replace('_', ' ')} customers.</p>
              </div>
            )
          )}
        </div>
      </section>
    );
  }
}

    