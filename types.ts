
export type UserRole = 'admin' | 'user';

export interface User {
  id: string; // Mudado para string (UUID do Supabase)
  username: string;
  full_name: string;
  role: UserRole;
  password?: string;
  email?: string;
  avatar?: string;
  created_at?: string;
}

export interface Client {
  id: string | number;
  name: string;
  razao_social?: string;
  document: string;
  email?: string;
  billing_email?: string;
  phone?: string;
  codigo_externo?: string;
  endereco?: string;
  observacao?: string;
  observacao_interna?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Equipment {
  id: string | number;
  name: string;
  model: string;
  serial_number: string;
  client_id: string | number;
}

export interface ServiceTaskType {
  id: string | number;
  name: string;
}

export interface Product {
  id: string | number;
  name: string;
  brand?: string;
  model?: string;
  category?: string;
  unit?: string;
  stock: number;
  minStock?: number;
  costPrice: number;
  salePrice: number;
  location?: string;
  warranty?: string;
  barcode?: string;
  image?: string;
  expiry_date?: string;
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface Activity {
  id: string | number;
  description: string;
  type: string;
  user: string;
  date: string;
}

export interface TrackingItem {
  id: string | number;
  created_at: string;
  type: 'purchase' | 'sale';
  code: string;
  carrier: string;
  description: string;
  status: string;
}

export interface Sale {
  id: string | number;
  client_id: string | number;
  client_name: string;
  amount: number;
  items_count: number;
  date: string;
  user_id: string | number;
}

export interface ServiceAttachment {
  id: string;
  url: string;
  name: string;
  created_at: string;
}

export interface Service {
  id: string | number;
  client_id: string | number;
  client_name?: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  price: number;
  responsible: string;
  date: string;
  hour: string;
  priority: 'baixa' | 'media' | 'alta';
  task_type?: string;
  estimated_duration?: string;
  external_code?: string;
  keywords?: string;
  check_in_type?: string;
  use_satisfaction_survey?: boolean;
  auto_send_os?: boolean;
  repeat_task?: boolean;
  team_mode?: 'collaborator' | 'team';
  questionnaire_id?: string;
  equipment_ids?: (string | number)[];
  signature_name?: string;
  signature_cpf?: string;
  created_at?: string;
  signature?: string;
  attachments?: ServiceAttachment[];
}

export type AppSection = 'dashboard' | 'products' | 'clients' | 'services' | 'tracking' | 'reports';
