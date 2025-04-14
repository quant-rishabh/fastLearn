import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Invalid or missing file' }, { status: 400 });
    }

    const filename = `${Date.now()}-${(file as File).name}`;

    const { error } = await supabase.storage
      .from('quiz-images')
      .upload(filename, file as Blob, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: 'Upload failed', details: error.message }, { status: 500 });
    }

    const { publicUrl } = supabase.storage
      .from('quiz-images')
      .getPublicUrl(filename).data;

    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: 'Unexpected server error', details: e.message }, { status: 500 });
  }
}
