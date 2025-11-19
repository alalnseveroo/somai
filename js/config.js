// Configurações centralizadas da aplicação
export const config = {
    supabase: {
        url: 'https://tlpclusfjqxiibbsjmzu.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscGNsdXNmanF4aWliYnNqbXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NjE5NjgsImV4cCI6MjA3ODUzNzk2OH0.Yqb-xx7fSiynzOpArAAeyeIivT-qE3SU2yGDkbONLks'
    },
    
    ai: {
        geminiApiKey: "", // Configurar com sua chave
        imagenApiKey: "" // Configurar com sua chave
    },
    
    pagination: {
        itemsPerPage: 10
    },
    
    defaults: {
        orderStatus: 'Pendente',
        paymentMethod: 'Dinheiro',
        productCategory: 'principal'
    },
    
    storage: {
        avatarPath: 'avatares',
        productImagePath: 'produtos'
    },

    plan: {
        priceBRL: 97,
        maxTenantsPerOwner: 1,
        maxEmployeesPerTenant: 5
    }
};
