export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  businessName?: string;
  isAdmin?: boolean;
  createdAt: string;
}

export type Brand = 'O Boticário' | 'Mary Kay' | 'Outros';

export interface Product {
  id: string;
  name: string;
  brand: Brand;
  category: string;
  code: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  minQuantity: number;
  imageUrl?: string;
  observations?: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  observations: string;
  totalDebt: number;
  createdAt: string;
}

export interface Sale {
  id: string;
  clientId?: string;
  clientName?: string;
  productId: string;
  productName: string;
  quantity: number;
  totalValue: number;
  paymentMethod: string;
  brand: Brand;
  date: string;
}

export interface Consortium {
  id: string;
  clientId: string;
  clientName: string;
  totalValue: number;
  entryValue: number;
  installmentsCount: number;
  dueDay: number;
  status: 'active' | 'completed' | 'cancelled';
  startDate?: string;
  createdAt: string;
}

export interface Installment {
  id: string;
  consortiumId: string;
  number: number;
  dueDate: string;
  value: number;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: string;
}

export interface Transaction {
  id: string;
  type: 'entry' | 'exit';
  brand: Brand | 'Geral';
  value: number;
  description: string;
  date: string;
}
