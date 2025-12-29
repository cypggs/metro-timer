import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 浏览器客户端（用于客户端组件）
export const createBrowserClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey)
}
