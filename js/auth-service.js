// Serviço de autenticação
export class AuthService {
    constructor(supabaseClient) {
        this.db = supabaseClient;
    }

    async signIn(email, password) {
        const { data, error } = await this.db.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        return data;
    }

    async signUp(email, password, metadata = {}) {
        const { data, error } = await this.db.auth.signUp({
            email,
            password,
            options: { data: metadata }
        });
        
        if (error) throw error;
        return data;
    }

    async signOut() {
        const { error } = await this.db.auth.signOut();
        if (error) throw error;
    }

    async getSession() {
        const { data, error } = await this.db.auth.getSession();
        if (error) throw error;
        return data.session;
    }

    async updateUser(updates) {
        const { data, error } = await this.db.auth.updateUser(updates);
        if (error) throw error;
        return data;
    }

    onAuthStateChange(callback) {
        return this.db.auth.onAuthStateChange(callback);
    }

    async getCurrentUser() {
        const { data, error } = await this.db.auth.getUser();
        if (error) throw error;
        return data.user;
    }
}
