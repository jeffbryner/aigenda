import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

export async function POST(request: NextRequest) {
  const targetUrl = process.env.EXTRACT_AGENDA_ITEM_URL;
  if (!targetUrl) {
    return NextResponse.json(
      { error: 'EXTRACT_AGENDA_ITEM_URL is not configured' },
      { status: 500 }
    );
  }

  const auth = new GoogleAuth();

  try {
    const client = await auth.getIdTokenClient(targetUrl);
    const body = await request.json();

    // Extract the inner data from the frontend request if it exists, or use the body directly
    // This maintains backward compatibility with how the frontend currently sends data
    const payload = body.data || body;

    const response = await client.request({
      url: targetUrl,
      method: 'POST',
      data: payload,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Proxy Error Details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return NextResponse.json(
      { error: 'Failed to proxy request to Cloud Function', details: error.message },
      { status: error.response?.status || 500 }
    );
  }
}
