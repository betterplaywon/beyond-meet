import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file.'
  );
}

/**
 * Supabase Admin Client
 * - 서버 사이드 전용
 * - Service Role Key 사용 (RLS 우회)
 * - 모든 데이터 접근 가능
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Supabase Storage Client (파일 업로드용)
 */
export const supabaseStorage = supabaseAdmin.storage;

export default supabaseAdmin;
