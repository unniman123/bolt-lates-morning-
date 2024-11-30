import { Application } from '@nativescript/core';
import { supabase } from './services/supabase';
import { setupDatabase } from './services/database-setup';

if (!supabase) {
    console.error('Supabase initialization failed. Please check your configuration.');
} else {
    // Set up database tables if they don't exist
    setupDatabase().catch(error => {
        console.error('Failed to set up database:', error);
    });
}

Application.run({ moduleName: 'app-root' });