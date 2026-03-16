
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zgvcfefpgefplqmblunr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_O3DGDJJFKNjkTct4Z-95Qg_JR6hf2Oc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const prepareData = (item: any) => {
  const { id, created_at, ...rawPayload } = item;
  
  const cleaned: any = {};
  Object.keys(rawPayload).forEach(key => {
    const value = rawPayload[key];
    
    // Permitimos null explicitamente para poder limpar campos no banco
    if (value === null) {
      cleaned[key] = null;
      return;
    }

    if (value === undefined) return;
    
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Se for string vazia, tratamos como null para o banco
      cleaned[key] = trimmed === '' ? null : trimmed;
    } else {
      cleaned[key] = value;
    }
  });

  // Garante que campos numéricos sejam convertidos corretamente
  const numericFields = ['price', 'amount', 'items_count', 'stock', 'minStock', 'costPrice', 'salePrice'];
  numericFields.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(cleaned, field) && cleaned[field] !== null) {
      cleaned[field] = parseFloat(String(cleaned[field])) || 0;
    }
  });

  // Tratamento especial para client_id (pode ser UUID ou Inteiro)
  if (cleaned.client_id !== undefined && cleaned.client_id !== null) {
    const asNum = Number(cleaned.client_id);
    if (!isNaN(asNum) && String(cleaned.client_id).length < 10) {
      cleaned.client_id = parseInt(String(cleaned.client_id), 10);
    }
  }
  
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
      console.log(`[DB] Saving client (update: ${isUpdate}):`, data);
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
      console.log(`[DB] Saving service (update: ${isUpdate}):`, data);
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
      console.log(`[DB] Saving user (update: ${isUpdate}):`, data);
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
      console.log(`[DB] Saving product (update: ${isUpdate}):`, data);
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
      console.log(`[DB] Saving sale (update: ${isUpdate}):`, data);
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
      console.log(`[DB] Saving tracking (update: ${isUpdate}):`, data);
      if (isUpdate) return await supabase.from('tracking').update(data).eq('id', id).select();
      return await supabase.from('tracking').insert({ ...data, id: item.id }).select();
    },
    delete: async (id: string | number) => await supabase.from('tracking').delete().eq('id', id)
  }
};
