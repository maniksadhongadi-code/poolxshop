
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

  useEffect(() => {
    const storedAuth = localStorage.getItem("is-authenticated") === "true";
    setIsAuthenticated(storedAuth);
    setIsClientReady(true);
  }, []);

  const firebaseState = useFirebase();
  
  useEffect(() => {
    if (isClientReady && isAuthenticated && firebaseState?.auth && !firebaseState?.user && !firebaseState?.isUserLoading) {
      initiateAnonymousSignIn(firebaseState.auth);
    }
  }, [isClientReady, isAuthenticated, firebaseState]);

  const { firestore, user, isUserLoading } = firebaseState || {};

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
      status: view,
    };
    
    let targetRef;
    if (view === 'one_year') {
      targetRef = oneYearCustomersRef;
    } else if (view === 'one_month') {
        targetRef = oneMonthCustomersRef;
    } else {
      targetRef = pendingCustomersRef;
    }

    if (!targetRef) {
       toast({ title: "Error", description: "Customer list not available.", variant: "destructive" });
       return;
    }

    addDocumentNonBlocking(targetRef, customerData);
    toast({
      title: "Customer Added",
      description: `${newCustomer.name} has been added to the ${view.replace('_', ' ')} list.`,
    });
    setAddDialogOpen(false);
  };

  const handleDeleteCustomer = (customerId: string, currentStatus: "one_year" | "one_month" | "pending") => {
    if (!firestore) return;
    
    let collectionName = `${currentStatus}_customers`;
    const docRef = doc(firestore, collectionName, customerId);
    
    deleteDocumentNonBlocking(docRef);
    
    toast({
      title: "Customer Deleted",
      description: `Customer has been deleted.`,
      variant: "destructive",
    });
  };
  
  const handleSwitchCustomer = async (customer: Customer, to: "one_year" | "one_month" | "pending") => {
    if (!firestore || !customer.id) return;
    const from = customer.status;

    if (from === to) return;

    const batch = writeBatch(firestore);

    const fromCollection = `${from}_customers`;
    const fromRef = doc(firestore, fromCollection, customer.id);
    
    const toCollection = `${to}_customers`;
    const toRef = doc(firestore, toCollection, customer.id);

    // Create a new object for the destination, ensuring we have all fields
    const newCustomerData = {
        ...customer,
        status: to,
    };

    batch.delete(fromRef);
    batch.set(toRef, newCustomerData);

    try {
        await batch.commit();
        toast({
            title: "Customer Moved",
            description: `${customer.name} moved to ${to.replace('_', ' ')} list.`,
        });
    } catch (error) {
       console.error("Error switching customer:", error);
       toast({
         title: "Error switching customer",
         description: "Could not update customer status.",
         variant: "destructive",
       });
    }
  };

  const handleDownload = () => {
    let customersToDownload: Customer[] | null | undefined;
    let currentViewName: string;

    switch (view) {
        case 'one_year':
            customersToDownload = oneYearCustomers;
            currentViewName = "One Year";
            break;
        case 'one_month':
            customersToDownload = oneMonthCustomers;
            currentViewName = "One Month";
            break;
        case 'pending':
            customersToDownload = pendingCustomers;
            currentViewName = "Pending";
            break;
        default:
            customersToDownload = [];
            currentViewName = "Customers"
    }

    if (!customersToDownload || customersToDownload.length === 0) {
      toast({ title: "No Data", description: `There are no ${currentViewName.toLowerCase()} customers to download.`, variant: "destructive" });
      return;
    }

    const dataForSheet = customersToDownload.map(customer => ({
      'Name': customer.name,
      'Mobile Number': String(customer.phoneNumber),
      'Activation Date': customer.createdAt ? format(customer.createdAt.toDate(), 'MMMM d, yyyy') : 'N/A'
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    
    worksheet['!cols'] = [
        { wch: 25 },
        { wch: 25 },
        { wch: 20 }
    ];
    
    const workbook = XLSX.utils.book_new();
    const sheetName = `${currentViewName} Customers`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${sheetName}.xlsx`);

     toast({
      title: "Download Started",
      description: `Your ${currentViewName.toLowerCase()} customer list is downloading.`,
    });
  };
  
  const overallIsLoading = !isClientReady || (isAuthenticated && (isUserLoading || !user));

  if (!isClientReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasswordProtection onAuthenticated={handlePasswordAuthenticated} />;
  }
  
  if (overallIsLoading && isAuthenticated) {
     return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Authenticating and loading customers...</p>
      </div>
    );
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

        <Tabs value={view} onValueChange={(value) => setView(value as "one_year" | "one_month" | "pending")} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="one_year">One Year</TabsTrigger>
            <TabsTrigger value="one_month">One Month</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
          </TabsList>
          <TabsContent value="one_year">
            {renderCustomerList(oneYearCustomers, isOneYearLoading || overallIsLoading, "one year")}
          </TabsContent>
          <TabsContent value="one_month">
            {renderCustomerList(oneMonthCustomers, isOneMonthLoading || overallIsLoading, "one month")}
          </TabsContent>
          <TabsContent value="pending">
            {renderCustomerList(pendingCustomers, isPendingLoading || overallIsLoading, "pending")}
          </TabsContent>
        </Tabs>

      </div>
    </main>
  );

  function renderCustomerList(customers: Customer[] | null | undefined, loading: boolean, listName: string) {
    if (loading) {
      return <div className="pt-4"><p>Loading {listName} customers...</p></div>;
    }
    
    if (!customers || customers.length === 0) {
       return (
         <div className="flex items-center justify-center h-48 rounded-lg border-2 border-dashed border-border text-muted-foreground p-8 mt-4">
            <p>No {listName} customers.</p>
          </div>
       )
    }

    return (
      <section>
        <div className="space-y-4 pt-4">
          {customers.map(customer => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onSwitch={handleSwitchCustomer}
              onDelete={(id) => handleDeleteCustomer(id, customer.status)}
            />
          ))}
        </div>
      </section>
    );
  }
}
