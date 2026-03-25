
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
const withTimeout = async (promise: any, timeoutMs: number = 90000) => {
  let timeoutId: any;
  const timeoutPromise = new Promise((_, reject) => 
    timeoutId = setTimeout(() => {
      reject(new Error('Tempo limite de conexão com o banco de dados excedido.'));
    }, timeoutMs)
  );
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    throw error;
  }
};

// Helper para retentativa em operações críticas
const withRetry = async (fn: () => any, retries: number = 10, timeoutMs: number = 60000, retryOnSupabaseError: boolean = false) => {
  let lastError: any;
  console.log(`[DB] Iniciando operação com ${retries} retentativas e timeout de ${timeoutMs}ms`);
  for (let i = 0; i < retries; i++) {
    try {
      const result = await withTimeout(fn(), timeoutMs);
      
      // Se a função retorna o padrão do Supabase { data, error }
      if (retryOnSupabaseError && result && result.error) {
        // Só retentamos se for erro de conexão/timeout do Supabase (status 0 ou 5xx)
        const status = result.error.status;
        const message = result.error.message?.toLowerCase() || '';
        if (!status || status === 0 || status >= 500 || message.includes('fetch') || message.includes('network')) {
          throw result.error;
        }
        // Erros 4xx (como credenciais inválidas) não devem ser retentados
        return result;
      }
      
      return result;
    } catch (err: any) {
      lastError = err;
      const errMsg = err.message?.toLowerCase() || '';
      console.warn(`[DB] Tentativa ${i + 1} falhou: ${err.message}`);
      
      // Se for erro de rede ou timeout, retentamos com delay exponencial
      if (i < retries - 1) {
        // Delay exponencial: ~1s, ~2.5s, ~6s, ~15s...
        const delay = Math.pow(2.2, i) * 1000 + (Math.random() * 500);
        console.log(`[DB] Retentando em ${Math.round(delay)}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  
  // Se chegamos aqui, todas as tentativas falharam
  const finalError = new Error(`Falha após ${retries} tentativas. Último erro: ${lastError.message}`);
  (finalError as any).originalError = lastError;
  throw finalError;
};

export const db = {
  auth: {
    signIn: async (email: string, pass: string) => {
      try {
        console.log(`[DB] Tentando login para ${email}...`);
        // Login interativo: 5 retentativas de 60s
        return await withRetry(() => supabase.auth.signInWithPassword({ email, password: pass }), 5, 60000, true);
      } catch (error: any) {
        console.error("[DB] Erro no signIn:", error.message || error);
        throw error;
      }
    },
    signOut: async () => {
      return await withTimeout(supabase.auth.signOut(), 15000);
    },
    getSession: async () => {
      try {
        // Sessão inicial: 10 retentativas de 60s.
        const { data, error } = await withRetry(() => supabase.auth.getSession(), 10, 60000, true);
        if (error) throw error;
        return data?.session;
      } catch (error) {
        console.error("[DB] Erro ao buscar sessão:", error);
        return null;
      }
    }
  },

  testConnection: async () => {
    try {
      console.log("[DB] Testando conexão com Supabase...");
      // Teste de conexão: 10 retentativas de 60s.
      const result = await withRetry(() => supabase.from('products').select('id').limit(1), 10, 60000, true);
      if (result.error) {
        console.error("[DB] Erro retornado pelo Supabase no teste:", result.error);
        throw result.error;
      }
      console.log("[DB] Conexão com Supabase OK");
      return true;
    } catch (err: any) {
      console.error("[DB] Falha na conexão com Supabase após várias tentativas:", err.message || err);
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
      try {
        const { data, error } = await withRetry(() => supabase.from('products').select('*').order('name'), 5, 45000);
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("[DB] Erro ao buscar produtos:", error);
        return [];
      }
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
      try {
        const { data, error } = await withRetry(() => supabase.from('clients').select('*').order('name'), 3, 20000);
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("[DB] Erro ao buscar clientes:", error);
        return [];
      }
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
      try {
        const { data, error } = await withRetry(() => supabase.from('services').select('*').order('date', { ascending: false }), 3, 20000);
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("[DB] Erro ao buscar serviços:", error);
        return [];
      }
    },
    getById: async (id: string | number) => {
      try {
        const { data, error } = await withRetry(() => supabase.from('services').select('*').eq('id', id).single(), 2, 15000);
        if (error) throw error;
        return data;
      } catch (error) {
        console.error("[DB] Erro ao buscar serviço por ID:", error);
        return null;
      }
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
      try {
        const { data, error } = await withRetry(() => supabase.from('service_task_types').select('*').order('name'), 3, 10000);
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("[DB] Erro ao buscar tipos de tarefa:", error);
        return [];
      }
    },
    saveTaskType: async (name: string) => {
      return await withTimeout(supabase.from('service_task_types').insert({ name }).select());
    }
  },
  users: {
    getAll: async () => {
      try {
        const { data, error } = await withRetry(() => supabase.from('users').select('*').order('full_name'), 5, 45000);
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("[DB] Erro ao buscar usuários:", error);
        return [];
      }
    },
    getByEmail: async (email: string) => {
      try {
        // Metadados do usuário: 10 retentativas de 60s.
        const { data, error } = await withRetry(() => supabase.from('users').select('*').eq('email', email).maybeSingle(), 10, 60000, true);
        if (error) throw error;
        return data;
      } catch (error) {
        console.error("[DB] Erro ao buscar metadados do usuário:", error);
        return null;
      }
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
      try {
        const { data, error } = await withRetry(() => supabase.from('activities').select('*').order('date', { ascending: false }), 3, 20000);
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("[DB] Erro ao buscar atividades:", error);
        return [];
      }
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
      try {
        const { data, error } = await withRetry(() => supabase.from('sales').select('*').order('date', { ascending: false }), 3, 20000);
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("[DB] Erro ao buscar vendas:", error);
        return [];
      }
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
      try {
        const { data, error } = await withRetry(() => supabase.from('tracking').select('*').order('created_at', { ascending: false }), 3, 20000);
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("[DB] Erro ao buscar rastreios:", error);
        return [];
      }
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
  },
  stock_movements: {
    getAll: async () => {
      try {
        const { data, error } = await withRetry(() => supabase.from('stock_movements').select('*').order('date', { ascending: false }), 5, 45000);
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("[DB] Erro ao buscar movimentações de estoque:", error);
        return [];
      }
    },
    save: async (item: any) => {
      const { isUpdate, id, data } = prepareData(item);
      console.log(`[DB] Saving stock movement (update: ${isUpdate}):`, data);
      
      // Se for uma nova movimentação, precisamos atualizar o estoque do produto
      if (!isUpdate) {
        try {
          const { data: product, error: fetchError } = await withRetry(() => supabase.from('products').select('stock').eq('id', data.product_id).single(), 2, 10000);
          if (fetchError) throw fetchError;
          
          if (product) {
            const newStock = data.type === 'in' 
              ? (product.stock || 0) + data.quantity 
              : (product.stock || 0) - data.quantity;
            
            await withTimeout(supabase.from('products').update({ stock: newStock }).eq('id', data.product_id), 10000);
          }
        } catch (err) {
          console.error("[DB] Erro ao atualizar estoque na movimentação:", err);
          // Continuamos para salvar a movimentação mesmo se a atualização do estoque falhar (embora não seja o ideal, evita travar o salvamento)
        }
      }

      const op = isUpdate
        ? supabase.from('stock_movements').update(data).eq('id', id).select()
        : supabase.from('stock_movements').insert(data).select();
      return await withTimeout(op);
    },
    delete: async (id: string | number) => await withTimeout(supabase.from('stock_movements').delete().eq('id', id))
  }
};
