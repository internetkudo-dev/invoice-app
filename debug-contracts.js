const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking contracts table...');
    const { data, error } = await supabase.from('contracts').select('*');

    if (error) {
        console.error('Error fetching contracts:', error);
    } else {
        console.log('Contracts found:', data.length);
        if (data.length > 0) console.log('Sample:', data[0]);
    }
}

check();
