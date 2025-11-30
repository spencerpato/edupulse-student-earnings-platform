import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUCCESS_STATUSES = ['SUCCESS', 'COMPLETED', 'success', 'completed', 'paid'];
const FAILED_STATUSES = ['FAILED', 'DECLINED', 'TIMEOUT', 'failed', 'declined', 'timeout'];
const CANCELLED_STATUSES = ['CANCELLED', 'cancelled', 'canceled', 'CANCELED'];
const PENDING_STATUSES = ['PENDING', 'WAITING_FOR_USER_ACTION', 'pending', 'waiting_for_user_action'];
const PROCESSING_STATUSES = ['PROCESSING', 'processing'];

function normalizeStatus(rawStatus: string): string {
  const status = rawStatus.toUpperCase();
  
  if (SUCCESS_STATUSES.some(s => s.toUpperCase() === status)) {
    return 'SUCCESS';
  }
  if (CANCELLED_STATUSES.some(s => s.toUpperCase() === status)) {
    return 'CANCELLED';
  }
  if (FAILED_STATUSES.some(s => s.toUpperCase() === status)) {
    return 'FAILED';
  }
  if (PROCESSING_STATUSES.some(s => s.toUpperCase() === status)) {
    return 'PROCESSING';
  }
  if (PENDING_STATUSES.some(s => s.toUpperCase() === status)) {
    return 'PENDING';
  }
  return 'PENDING';
}

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
      throw new Error('Payment record not found');
    }

    if (paymentRecord.payment_status === 'completed') {
      return new Response(
        JSON.stringify({ 
          success: true,
          status: 'SUCCESS',
          message: 'Payment already completed.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lipanaPaymentId = paymentId || paymentRecord.lipana_transaction_id;

    if (!lipanaPaymentId) {
      return new Response(
        JSON.stringify({ 
          success: true,
          status: 'PENDING',
          message: 'Waiting for payment...'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying payment:', lipanaPaymentId);

    const lipanaResponse = await fetch(`https://api.lipana.dev/v1/payments/${lipanaPaymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': lipanaSecretKey,
      },
    });

    const lipanaResult = await lipanaResponse.json();
    console.log('Lipana verification response:', JSON.stringify(lipanaResult));

    const rawStatus = lipanaResult.data?.status || lipanaResult.status || 'PENDING';
    const normalizedStatus = normalizeStatus(rawStatus);
    console.log('Status:', rawStatus, '->', normalizedStatus);

    if (normalizedStatus === 'SUCCESS') {
      console.log('Payment confirmed! Creating user account...');

      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'registration_fee')
        .single();

      const registrationFee = settingsData ? Number(settingsData.value) : paymentRecord.amount;

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: paymentRecord.email,
        password: paymentRecord.password_hash,
        email_confirm: true,
        user_metadata: {
          full_name: paymentRecord.full_name,
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
          referred_by: paymentRecord.referred_by || null,
        })
        .eq('id', authData.user.id);

      if (paymentRecord.referred_by) {
        const referralBonus = registrationFee * 0.25;

        await supabase
          .from('referral_earnings')
          .insert({
            referrer_id: paymentRecord.referred_by,
            referred_user_id: authData.user.id,
            amount: referralBonus,
            is_withdrawable: true,
          });

        const { data: referrer } = await supabase
          .from('profiles')
          .select('approved_balance, total_earnings')
          .eq('id', paymentRecord.referred_by)
          .single();

        if (referrer) {
          await supabase
            .from('profiles')
            .update({
              approved_balance: (referrer.approved_balance || 0) + referralBonus,
              total_earnings: (referrer.total_earnings || 0) + referralBonus,
            })
            .eq('id', paymentRecord.referred_by);
        }
        console.log('Referral bonus processed');
      }

      await supabase
        .from('payments')
        .update({
          payment_status: 'completed',
          completed_at: new Date().toISOString(),
          password_hash: null,
        })
        .eq('merchant_reference', merchantReference);

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: paymentRecord.email,
        password: paymentRecord.password_hash,
      });

      if (signInError || !signInData.session) {
        console.error('Error signing in user:', signInError);
        return new Response(
          JSON.stringify({ 
            success: true,
            status: 'SUCCESS',
            autoLoginFailed: true,
            message: 'Payment successful! Please log in.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          status: 'SUCCESS',
          session: signInData.session,
          message: 'Payment successful!'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (normalizedStatus === 'CANCELLED') {
      await supabase
        .from('payments')
        .update({ payment_status: 'cancelled', password_hash: null })
        .eq('merchant_reference', merchantReference);

      return new Response(
        JSON.stringify({ 
          success: false,
          status: 'CANCELLED',
          message: 'Payment cancelled by user.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (normalizedStatus === 'FAILED') {
      await supabase
        .from('payments')
        .update({ payment_status: 'failed', password_hash: null })
        .eq('merchant_reference', merchantReference);

      return new Response(
        JSON.stringify({ 
          success: false,
          status: 'FAILED',
          message: 'Payment failed. Please try again.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (normalizedStatus === 'PROCESSING') {
      return new Response(
        JSON.stringify({ 
          success: true,
          status: 'PROCESSING',
          message: 'Payment is being processed...'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        status: 'PENDING',
        message: 'Waiting for payment...'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payment verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      success: false, 
      status: 'ERROR',
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
