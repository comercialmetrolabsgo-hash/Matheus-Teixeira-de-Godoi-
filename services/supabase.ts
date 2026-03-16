
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

// Helper para timeout em operações do Supabase
const withTimeout = async (promise: any, timeoutMs: number = 10000) => {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Tempo limite de conexão com o banco de dados excedido.')), timeoutMs)
  );
  return Promise.race([promise, timeoutPromise]);
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

  testConnection: async () => {
    try {
      const { data, error } = await withTimeout(supabase.from('products').select('id').limit(1), 5000);
      if (error) throw error;
      console.log("[DB] Conexão com Supabase OK");
      return true;
    } catch (err) {
      console.error("[DB] Falha na conexão com Supabase:", err);
      return false;
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

  products: {
    getAll: async () => {
      const { data, error } = await withTimeout(supabase.from('products').select('*').order('name'), 8000);
      if (error) console.error("[DB] Erro ao buscar produtos:", error);
      return data || [];
    },
    save: async (item: any) => {
      const { isUpdate, id, data } = prepareData(item);
      console.log(`[DB] Saving product (update: ${isUpdate}):`, data);
      const op = isUpdate
        ? supabase.from('products').update(data).eq('id', id).select()
        : supabase.from('products').insert(data).select();
      return await withTimeout(op);
    },
    delete: async (id: string | number) => await withTimeout(supabase.from('products').delete().eq('id', id))
  },
  clients: {
    getAll: async () => {
      const { data, error } = await withTimeout(supabase.from('clients').select('*').order('name'), 8000);
      if (error) console.error("[DB] Erro ao buscar clientes:", error);
      return data || [];
    },
    save: async (item: any) => { 
      const { isUpdate, id, data } = prepareData(item);
      console.log(`[DB] Saving client (update: ${isUpdate}):`, data);
      const op = isUpdate 
        ? supabase.from('clients').update(data).eq('id', id).select()
        : supabase.from('clients').insert(data).select();
      return await withTimeout(op);
    },
    delete: async (id: string | number) => await withTimeout(supabase.from('clients').delete().eq('id', id))
  },
  services: {
    getAll: async () => {
      const { data, error } = await withTimeout(supabase.from('services').select('*').order('date', { ascending: false }), 8000);
      if (error) console.error("[DB] Erro ao buscar serviços:", error);
      return data || [];
    },
    getById: async (id: string | number) => {
      const { data, error } = await withTimeout(supabase.from('services').select('*').eq('id', id).single(), 5000);
      if (error) console.error("[DB] Erro ao buscar serviço por ID:", error);
      return data;
    },
    save: async (item: any) => {
      const { isUpdate, id, data } = prepareData(item);
      console.log(`[DB] Saving service (update: ${isUpdate}):`, data);
      const op = isUpdate
        ? supabase.from('services').update(data).eq('id', id).select()
        : supabase.from('services').insert(data).select();
      return await withTimeout(op);
    },
    delete: async (id: string | number) => await withTimeout(supabase.from('services').delete().eq('id', id)),
    
    getTaskTypes: async () => {
      const { data, error } = await withTimeout(supabase.from('service_task_types').select('*').order('name'), 5000);
      if (error) console.error("[DB] Erro ao buscar tipos de tarefa:", error);
      return data || [];
    },
    saveTaskType: async (name: string) => {
      return await withTimeout(supabase.from('service_task_types').insert({ name }).select());
    }
  },
  users: {
    getAll: async () => {
      const { data, error } = await withTimeout(supabase.from('users').select('*').order('full_name'), 8000);
      if (error) console.error("[DB] Erro ao buscar usuários:", error);
      return data || [];
    },
    getByEmail: async (email: string) => {
      const { data, error } = await withTimeout(supabase.from('users').select('*').eq('email', email).maybeSingle(), 5000);
      if (error) console.error("[DB] Erro ao buscar metadados do usuário:", error);
      return data;
    },
    save: async (item: any) => {
      const { isUpdate, id, data } = prepareData(item);
      console.log(`[DB] Saving user (update: ${isUpdate}):`, data);
      const op = isUpdate
        ? supabase.from('users').update(data).eq('id', id).select()
        : supabase.from('users').insert(data).select();
      return await withTimeout(op);
    },
    delete: async (id: string | number) => await withTimeout(supabase.from('users').delete().eq('id', id))
  },
  activities: {
    getAll: async () => {
      const { data, error } = await withTimeout(supabase.from('activities').select('*').order('date', { ascending: false }), 8000);
      if (error) console.error("[DB] Erro ao buscar atividades:", error);
      return data || [];
    },
    log: async (description: string, type: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.user_metadata?.full_name || user?.email || 'Sistema';
      return await withTimeout(supabase.from('activities').insert({ 
        description, type, "user": userName, date: new Date().toISOString() 
      }));
    }
  },
  sales: {
    getAll: async () => {
      const { data, error } = await withTimeout(supabase.from('sales').select('*').order('date', { ascending: false }), 8000);
      if (error) console.error("[DB] Erro ao buscar vendas:", error);
      return data || [];
    },
    save: async (item: any) => {
      const { isUpdate, id, data } = prepareData(item);
      console.log(`[DB] Saving sale (update: ${isUpdate}):`, data);
      const op = isUpdate
        ? supabase.from('sales').update(data).eq('id', id).select()
        : supabase.from('sales').insert(data).select();
      return await withTimeout(op);
    },
    delete: async (id: string | number) => await withTimeout(supabase.from('sales').delete().eq('id', id))
  },
  tracking: {
    getAll: async () => {
      const { data, error } = await withTimeout(supabase.from('tracking').select('*').order('created_at', { ascending: false }), 8000);
      if (error) console.error("[DB] Erro ao buscar rastreios:", error);
      return data || [];
    },
    save: async (item: any) => {
      const { isUpdate, id, data } = prepareData(item);
      console.log(`[DB] Saving tracking (update: ${isUpdate}):`, data);
      const op = isUpdate
        ? supabase.from('tracking').update(data).eq('id', id).select()
        : supabase.from('tracking').insert({ ...data, id: item.id }).select();
      return await withTimeout(op);
    },
    delete: async (id: string | number) => await withTimeout(supabase.from('tracking').delete().eq('id', id))
  }
};
