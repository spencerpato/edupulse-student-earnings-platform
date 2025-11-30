import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FAILED_STATUSES = [
  'PENDING',
  'WAITING_FOR_USER_ACTION', 
  'PROCESSING',
  'FAILED',
  'DECLINED',
  'CANCELLED',
  'TIMEOUT',
  'pending',
  'failed',
  'cancelled',
  'declined',
  'timeout'
];

const SUCCESS_STATUSES = [
  'SUCCESS',
  'COMPLETED',
  'success',
  'completed',
  'paid'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { merchantReference, paymentId } = await req.json();

    const lipanaSecretKey = Deno.env.get('LIPANA_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!lipanaSecretKey) {
      throw new Error('Lipana credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: paymentRecord, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('merchant_reference', merchantReference)
      .single();

    if (fetchError || !paymentRecord) {
      console.error('Payment record not found:', fetchError);
      throw new Error('Payment record not found');
    }

    if (paymentRecord.payment_status === 'completed') {
      return new Response(
        JSON.stringify({ 
          success: true,
          status: 'completed',
          message: 'Payment already completed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transactionId = paymentId || paymentRecord.lipana_transaction_id;
    
    if (!transactionId) {
      return new Response(
        JSON.stringify({ 
          success: false,
          status: 'pending',
          message: 'Awaiting payment confirmation'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying payment with Lipana:', transactionId);

    const lipanaResponse = await fetch(`https://api.lipana.dev/v1/payments/${transactionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': lipanaSecretKey,
      },
    });

    const lipanaResult = await lipanaResponse.json();
    console.log('Lipana verification response:', JSON.stringify(lipanaResult));

    const paymentStatus = lipanaResult.data?.status || lipanaResult.status || '';
    
    console.log('Payment status from Lipana:', paymentStatus);

    if (SUCCESS_STATUSES.some(s => paymentStatus.toUpperCase() === s.toUpperCase())) {
      console.log('Payment confirmed successful!');

      const ipnData = paymentRecord.ipn_data as { password?: string; fullName?: string; email?: string; referredBy?: string } | null;
      
      if (!ipnData || !ipnData.email || !ipnData.password) {
        console.error('Missing registration data in payment record');
        throw new Error('Registration data not found');
      }

      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'registration_fee')
        .single();

      if (settingsError) {
        console.error('Error fetching registration fee:', settingsError);
        throw new Error('Failed to fetch registration fee');
      }

      const registrationFee = Number(settingsData.value);

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: ipnData.email,
        password: ipnData.password,
        email_confirm: true,
        user_metadata: {
          full_name: ipnData.fullName,
        },
      });

      if (authError || !authData.user) {
        console.error('Error creating user:', authError);
        throw new Error('Failed to create user account: ' + (authError?.message || 'Unknown error'));
      }

      console.log('User created:', authData.user.id);

      const { error: walletError } = await supabase
        .from('profiles')
        .update({
          approved_balance: registrationFee,
          total_earnings: registrationFee,
          referred_by: ipnData.referredBy || null,
        })
        .eq('id', authData.user.id);

      if (walletError) {
        console.error('Error updating wallet:', walletError);
      }

      if (ipnData.referredBy) {
        const referralBonus = registrationFee * 0.25;

        const { error: referralError } = await supabase
          .from('referral_earnings')
          .insert({
            referrer_id: ipnData.referredBy,
            referred_user_id: authData.user.id,
            amount: referralBonus,
            is_withdrawable: true,
          });

        if (referralError) {
          console.error('Error creating referral earning:', referralError);
        }

        const { data: referrer } = await supabase
          .from('profiles')
          .select('approved_balance, total_earnings')
          .eq('id', ipnData.referredBy)
          .single();

        if (referrer) {
          await supabase
            .from('profiles')
            .update({
              approved_balance: (referrer.approved_balance || 0) + referralBonus,
              total_earnings: (referrer.total_earnings || 0) + referralBonus,
            })
            .eq('id', ipnData.referredBy);

          console.log('Referral bonus processed');
        }
      }

      const { error: updateError } = await supabase
        .from('payments')
        .update({
          payment_status: 'completed',
          completed_at: new Date().toISOString(),
          ipn_data: { ...ipnData, password: '[REDACTED]' },
        })
        .eq('merchant_reference', merchantReference);

      if (updateError) {
        console.error('Error updating payment status:', updateError);
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          status: 'completed',
          message: 'Payment verified and account created successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (FAILED_STATUSES.some(s => paymentStatus.toUpperCase() === s.toUpperCase())) {
      console.log('Payment failed or cancelled:', paymentStatus);

      await supabase
        .from('payments')
        .update({
          payment_status: 'failed',
          ipn_data: { ...paymentRecord.ipn_data, password: '[REDACTED]', failReason: paymentStatus },
        })
        .eq('merchant_reference', merchantReference);

      return new Response(
        JSON.stringify({ 
          success: false,
          status: 'failed',
          message: 'Payment not completed. Please try again.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        status: 'pending',
        message: 'Payment is still being processed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ success: false, error: errorMessage, status: 'error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
