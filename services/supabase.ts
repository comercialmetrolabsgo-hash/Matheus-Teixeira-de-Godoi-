
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zgvcfefpgefplqmblunr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_O3DGDJJFKNjkTct4Z-95Qg_JR6hf2Oc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const prepareData = (item: any) => {
  const { id, created_at, ...rawPayload } = item;
  
  const cleaned: any = {};
  Object.keys(rawPayload).forEach(key => {
    const value = rawPayload[key];
    if (value === undefined || value === null) return;
    
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') return;
      cleaned[key] = trimmed;
    } else {
      cleaned[key] = value;
    }
  });

  // Garante que campos numéricos de negócio sejam tratados corretamente
  // Mas NÃO toca no client_id se ele for UUID (string longa com hífens)
  if (cleaned.client_id && !isNaN(Number(cleaned.client_id))) {
    cleaned.client_id = parseInt(String(cleaned.client_id), 10);
  }
  
  if (cleaned.price) cleaned.price = parseFloat(String(cleaned.price)) || 0;
  if (cleaned.amount) cleaned.amount = parseFloat(String(cleaned.amount)) || 0;
  if (cleaned.items_count) cleaned.items_count = parseInt(String(cleaned.items_count), 10) || 0;
  if (cleaned.stock) cleaned.stock = parseInt(String(cleaned.stock), 10) || 0;
  if (cleaned.minStock) cleaned.minStock = parseInt(String(cleaned.minStock), 10) || 0;
  
  const isUpdate = id !== undefined && id !== null && id !== '';
  
  return { 
    isUpdate,
    id: isUpdate ? id : null, 
    data: cleaned 
  };
};

export const db = {
  auth: {
    signIn: async (email: string, pass: string) => {
      return await supabase.auth.signInWithPassword({ email, password: pass });
    },
    signOut: async () => {
      return await supabase.auth.signOut();
    },
    getSession: async () => {
      const { data } = await supabase.auth.getSession();
      return data?.session;
    }
  },

  subscribe: (table: string, callback: () => void) => {
    return supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        callback();
      })
      .subscribe();
  },

  clients: {
    getAll: async () => {
      const { data } = await supabase.from('clients').select('*').order('name');
      return data || [];
    },
    save: async (item: any) => { 
      const { isUpdate, id, data } = prepareData(item);
      if (isUpdate) return await supabase.from('clients').update(data).eq('id', id).select();
      return await supabase.from('clients').insert(data).select();
    },
    delete: async (id: string | number) => await supabase.from('clients').delete().eq('id', id)
  },

  services: {
    getAll: async () => {
      const { data } = await supabase.from('services').select('*').order('date', { ascending: false });
      return data || [];
    },
    getById: async (id: string | number) => {
      const { data } = await supabase.from('services').select('*').eq('id', id).single();
      return data;
    },
    save: async (item: any) => {
      const { isUpdate, id, data } = prepareData(item);
      if (isUpdate) return await supabase.from('services').update(data).eq('id', id).select();
      return await supabase.from('services').insert(data).select();
    },
    delete: async (id: string | number) => await supabase.from('services').delete().eq('id', id),
    
    getTaskTypes: async () => {
      const { data } = await supabase.from('service_task_types').select('*').order('name');
      return data || [];
    },
    saveTaskType: async (name: string) => {
      return await supabase.from('service_task_types').insert({ name }).select();
    }
  },

  users: {
    getAll: async () => {
      const { data } = await supabase.from('users').select('*').order('full_name');
      return data || [];
    },
    getByEmail: async (email: string) => {
      const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      if (error) console.error("Erro ao buscar metadados do usuário:", error);
      return data;
    },
    save: async (item: any) => {
      const { isUpdate, id, data } = prepareData(item);
      // Para usuários, SEMPRE usamos o ID fornecido (que vem do Auth)
      if (isUpdate) return await supabase.from('users').update(data).eq('id', id).select();
      return await supabase.from('users').insert(data).select();
    },
    delete: async (id: string | number) => await supabase.from('users').delete().eq('id', id)
  },

  activities: {
    getAll: async () => {
      const { data } = await supabase.from('activities').select('*').order('date', { ascending: false });
      return data || [];
    },
    log: async (description: string, type: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.user_metadata?.full_name || user?.email || 'Sistema';
      return await supabase.from('activities').insert({ 
        description, type, "user": userName, date: new Date().toISOString() 
      });
    }
  },

  products: {
    getAll: async () => {
      const { data } = await supabase.from('products').select('*').order('name');
      return data || [];
    },
    save: async (item: any) => {
      const { isUpdate, id, data } = prepareData(item);
      if (isUpdate) return await supabase.from('products').update(data).eq('id', id).select();
      return await supabase.from('products').insert(data).select();
    },
    delete: async (id: string | number) => await supabase.from('products').delete().eq('id', id)
  },

  sales: {
    getAll: async () => {
      const { data } = await supabase.from('sales').select('*').order('date', { ascending: false });
      return data || [];
    },
    save: async (item: any) => {
      const { isUpdate, id, data } = prepareData(item);
      if (isUpdate) return await supabase.from('sales').update(data).eq('id', id).select();
      return await supabase.from('sales').insert(data).select();
    },
    delete: async (id: string | number) => await supabase.from('sales').delete().eq('id', id)
  },

  tracking: {
    getAll: async () => {
      const { data } = await supabase.from('tracking').select('*').order('created_at', { ascending: false });
      return data || [];
    },
    save: async (item: any) => {
      const { isUpdate, id, data } = prepareData(item);
      if (isUpdate) return await supabase.from('tracking').update(data).eq('id', id).select();
      return await supabase.from('tracking').insert({ ...data, id: item.id }).select();
    },
    delete: async (id: string | number) => await supabase.from('tracking').delete().eq('id', id)
  }
};
