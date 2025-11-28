import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { merchantReference, amount, phoneNumber, email, fullName } = await req.json();

    const consumerKey = Deno.env.get('PESAPAL_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('PESAPAL_CONSUMER_SECRET');

    if (!consumerKey || !consumerSecret) {
      throw new Error('Pesapal credentials not configured');
    }

    // Step 1: Get OAuth token
    const tokenResponse = await fetch('https://pay.pesapal.com/v3/api/Auth/RequestToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Pesapal token error:', errorText);
      throw new Error('Failed to get Pesapal authentication token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.token;

    console.log('Pesapal token obtained successfully');

    // Step 2: Register IPN URL (if not already registered)
    const ipnUrl = `https://skmhyvqlbxhsorulkfns.supabase.co/functions/v1/pesapal-ipn`;
    let notificationId = '';

    const ipnResponse = await fetch('https://pay.pesapal.com/v3/api/URLSetup/RegisterIPN', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        url: ipnUrl,
        ipn_notification_type: 'POST',
      }),
    });

    if (!ipnResponse.ok) {
      const errorText = await ipnResponse.text();
      console.error('IPN registration error:', errorText);
      throw new Error('Failed to register Pesapal IPN URL');
    } else {
      const ipnData = await ipnResponse.json();
      console.log('IPN registration:', ipnData);
      notificationId = ipnData.ipn_id || '';
      if (!notificationId) {
        throw new Error('Invalid IPN ID returned from Pesapal');
      }
    }

    // Step 3: Submit order
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/pesapal-ipn`;
    
    const orderData = {
      id: merchantReference,
      currency: 'KES',
      amount: amount,
      description: 'EduPulse Registration (Refundable)',
      callback_url: callbackUrl,
      notification_id: notificationId,
      billing_address: {
        email_address: email,
        phone_number: phoneNumber,
        first_name: fullName.split(' ')[0] || fullName,
        last_name: fullName.split(' ').slice(1).join(' ') || '',
      },
    };

    console.log('Submitting order to Pesapal:', { merchantReference, amount });

    const orderResponse = await fetch('https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('Pesapal order submission error (HTTP error):', errorText);
      throw new Error('Failed to submit order to Pesapal');
    }

    const orderResult = await orderResponse.json();
    console.log('Pesapal order response:', orderResult);

    if (orderResult.status !== '200' || orderResult.error) {
      console.error('Pesapal order error payload:', orderResult);
      const message =
        (orderResult.error && (orderResult.error.message || orderResult.error.code)) ||
        'Failed to submit order to Pesapal';
      throw new Error(message);
    }

    // Return the redirect URL
    return new Response(
      JSON.stringify({ 
        success: true, 
        redirectUrl: orderResult.redirect_url,
        orderTrackingId: orderResult.order_tracking_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Pesapal checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
