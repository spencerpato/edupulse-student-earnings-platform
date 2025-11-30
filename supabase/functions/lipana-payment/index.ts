import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { merchantReference, amount, phoneNumber, email, fullName, password, referredBy } = await req.json();

    const lipanaSecretKey = Deno.env.get('LIPANA_SECRET_KEY');

    if (!lipanaSecretKey) {
      console.error('LIPANA_SECRET_KEY not found in environment');
      throw new Error('Lipana credentials not configured');
    }

    console.log('Initiating Lipana payment:', { merchantReference, amount, phoneNumber });

    let formattedPhone = phoneNumber;
    if (phoneNumber.startsWith('0')) {
      formattedPhone = '+254' + phoneNumber.substring(1);
    } else if (phoneNumber.startsWith('254')) {
      formattedPhone = '+' + phoneNumber;
    } else if (!phoneNumber.startsWith('+')) {
      formattedPhone = '+' + phoneNumber;
    }

    console.log('Formatted phone:', formattedPhone);

    const lipanaResponse = await fetch('https://api.lipana.dev/v1/transactions/push-stk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': lipanaSecretKey,
      },
      body: JSON.stringify({
        phone: formattedPhone,
        amount: amount,
      }),
    });

    const lipanaResult = await lipanaResponse.json();
    console.log('Lipana response status:', lipanaResponse.status);
    console.log('Lipana response:', JSON.stringify(lipanaResult));

    if (!lipanaResponse.ok) {
      console.error('Lipana API error:', lipanaResult);
      throw new Error(lipanaResult.message || lipanaResult.error || 'Failed to initiate Lipana payment');
    }

    if (lipanaResult.success) {
      console.log('STK Push initiated successfully');

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const paymentId = lipanaResult.data?.transactionId || lipanaResult.data?.checkoutRequestID || lipanaResult.data?.paymentId;
      
      console.log('Lipana paymentId:', paymentId);

      const { error: updateError } = await supabase
        .from('payments')
        .update({
          lipana_transaction_id: paymentId,
          payment_status: 'awaiting_confirmation',
          ipn_data: {
            password: password,
            fullName: fullName,
            email: email,
            referredBy: referredBy,
          }
        })
        .eq('merchant_reference', merchantReference);

      if (updateError) {
        console.error('Error updating payment record:', updateError);
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          paymentId: paymentId,
          merchantReference: merchantReference,
          message: 'STK push sent. Please complete payment on your phone.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error(lipanaResult.message || 'Failed to initiate STK push');
    }
  } catch (error) {
    console.error('Lipana payment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
