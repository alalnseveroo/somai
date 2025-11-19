/**
 * Configuração do Supabase
 */

export const SUPABASE_CONFIG = {
  url: 'https://tlpclusfjqxiibbsjmzu.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscGNsdXNmanF4aWliYnNqbXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NjE5NjgsImV4cCI6MjA3ODUzNzk2OH0.Yqb-xx7fSiynzOpArAAeyeIivT-qE3SU2yGDkbONLks',
  options: {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
};

/**
 * Cria e retorna uma instância do cliente Supabase
 */
export function createSupabaseClient() {
  if (typeof window.supabase === 'undefined') {
    throw new Error('Supabase library não foi carregada');
  }

  const { createClient } = window.supabase;
  return createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, SUPABASE_CONFIG.options);
}
