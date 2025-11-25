import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const { email, password } = await request.json();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // SET SESSION COOKIES!
  const response = NextResponse.json({
    user: data.user,
    role: (await supabase.from('users').select('role').eq('id', data.user.id).single()).data?.role || 'user',
  });

  // Set Supabase auth cookies
  await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  return response;
}