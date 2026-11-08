import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // localStorage (e non sessionStorage): la sessione sopravvive a nuove
        // schede e al riavvio del browser.
        storage: window.localStorage
    }
});
