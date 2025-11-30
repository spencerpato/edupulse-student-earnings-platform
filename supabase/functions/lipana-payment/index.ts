import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUCCESS_STATUSES = ['SUCCESS', 'COMPLETED', 'success', 'completed', 'paid'];
const FAILED_STATUSES = ['FAILED', 'DECLINED', 'CANCELLED', 'TIMEOUT', 'failed', 'declined', 'cancelled', 'timeout'];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function verifyPaymentWithLipana(paymentId: string, lipanaSecretKey: string): Promise<string> {
  try {
    const response = await fetch(`https://api.lipana.dev/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': lipanaSecretKey,
      },
    });

    const result = await response.json();
    console.log('Lipana verification response:', JSON.stringify(result));

    const status = result.data?.status || result.status || '';
    
    if (SUCCESS_STATUSES.some(s => status.toUpperCase() === s.toUpperCase())) {
      return 'completed';
    }
    if (FAILED_STATUSES.some(s => status.toUpperCase() === s.toUpperCase())) {
      return 'failed';
    }
    return 'pending';
  } catch (err) {
    console.error('Verification check error:', err);
    return 'pending';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { merchantReference, amount, phoneNumber, email, fullName, password, referredBy } = await req.json();

    const lipanaSecretKey = Deno.env.get('LIPANA_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!lipanaSecretKey) {
      console.error('LIPANA_SECRET_KEY not found in environment');
      throw new Error('Lipana credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    if (!lipanaResult.success) {
      throw new Error(lipanaResult.message || 'Failed to initiate STK push');
    }

    console.log('STK Push initiated successfully');

    const paymentId = lipanaResult.data?.transactionId || lipanaResult.data?.checkoutRequestID || lipanaResult.data?.paymentId;
    console.log('Payment ID:', paymentId);

    await supabase
      .from('payments')
      .update({
        lipana_transaction_id: paymentId,
        payment_status: 'awaiting_confirmation',
      })
      .eq('merchant_reference', merchantReference);

    const maxAttempts = 10;
    const pollInterval = 3000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Verification attempt ${attempt}/${maxAttempts}...`);
      
      await sleep(pollInterval);
      
      const status = await verifyPaymentWithLipana(paymentId, lipanaSecretKey);
      console.log(`Attempt ${attempt} status: ${status}`);

      if (status === 'completed') {
        console.log('Payment confirmed! Creating user account...');

        const { data: settingsData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'registration_fee')
          .single();

        const registrationFee = settingsData ? Number(settingsData.value) : amount;

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
          },
        });

        if (authError || !authData.user) {
          console.error('Error creating user:', authError);
          throw new Error('Failed to create user account: ' + (authError?.message || 'Unknown error'));
        }

        console.log('User created:', authData.user.id);

        await supabase
          .from('profiles')
          .update({
            approved_balance: registrationFee,
            total_earnings: registrationFee,
            referred_by: referredBy || null,
          })
          .eq('id', authData.user.id);

        if (referredBy) {
          const referralBonus = registrationFee * 0.25;

          await supabase
            .from('referral_earnings')
            .insert({
              referrer_id: referredBy,
              referred_user_id: authData.user.id,
              amount: referralBonus,
              is_withdrawable: true,
            });

          const { data: referrer } = await supabase
            .from('profiles')
            .select('approved_balance, total_earnings')
            .eq('id', referredBy)
            .single();

          if (referrer) {
            await supabase
              .from('profiles')
              .update({
                approved_balance: (referrer.approved_balance || 0) + referralBonus,
                total_earnings: (referrer.total_earnings || 0) + referralBonus,
              })
              .eq('id', referredBy);
          }
          console.log('Referral bonus processed');
        }

        await supabase
          .from('payments')
          .update({
            payment_status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('merchant_reference', merchantReference);

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (signInError || !signInData.session) {
          console.error('Error signing in user:', signInError);
          return new Response(
            JSON.stringify({ 
              success: true,
              paymentComplete: true,
              autoLoginFailed: true,
              message: 'Payment successful and account created. Please log in manually.'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            paymentComplete: true,
            session: signInData.session,
            message: 'Payment successful and account created!'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (status === 'failed') {
        console.log('Payment failed or cancelled');
        
        await supabase
          .from('payments')
          .update({ payment_status: 'failed' })
          .eq('merchant_reference', merchantReference);

        return new Response(
          JSON.stringify({ 
            success: false,
            paymentComplete: false,
            error: 'Payment not completed. Please try again.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Payment still pending after polling, returning pending status');
    
    return new Response(
      JSON.stringify({ 
        success: true,
        paymentComplete: false,
        paymentId: paymentId,
        merchantReference: merchantReference,
        message: 'Payment initiated. Please complete on your phone and wait.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Lipana payment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
