import type { Timestamp } from "firebase/firestore";

export type Customer = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: 'pending' | 'active';
  createdAt: Timestamp;
  expiryDate?: Timestamp;
};
