
import type { Timestamp } from "firebase/firestore";

export type Customer = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: 'one_year' | 'one_month' | 'pending';
  createdAt: Timestamp;
};

    