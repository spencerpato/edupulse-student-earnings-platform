import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const ipnData = await req.json();
    console.log('Received IPN:', ipnData);

    const {
      OrderTrackingId,
      OrderMerchantReference,
      OrderNotificationType,
      pesapal_transaction_tracking_id,
    } = ipnData;

    // Find the payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('merchant_reference', OrderMerchantReference)
      .single();

    if (paymentError || !payment) {
      console.error('Payment not found:', OrderMerchantReference);
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update payment record with IPN data
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        pesapal_tracking_id: pesapal_transaction_tracking_id || OrderTrackingId,
        payment_status: OrderNotificationType === 'COMPLETED' ? 'completed' : 'failed',
        completed_at: OrderNotificationType === 'COMPLETED' ? new Date().toISOString() : null,
        ipn_data: ipnData,
      })
      .eq('merchant_reference', OrderMerchantReference);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update payment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only proceed if payment is completed
    if (OrderNotificationType === 'COMPLETED') {
      console.log('Payment completed, creating user account...');

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: payment.email,
        email_confirm: true,
        user_metadata: {
          full_name: payment.full_name,
        },
      });

      if (authError || !authData.user) {
        console.error('Error creating user:', authError);
        return new Response(JSON.stringify({ error: 'Failed to create user account' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('User created:', authData.user.id);

      // Add KES 100 to their wallet as refundable credit
      const { error: walletError } = await supabase
        .from('profiles')
        .update({
          approved_balance: 100.00,
          total_earnings: 100.00,
        })
        .eq('id', authData.user.id);

      if (walletError) {
        console.error('Error updating wallet:', walletError);
      }

      // Handle referral bonus if applicable
      if (payment.referred_by) {
        const referralBonus = 25.00; // 25% of KES 100

        // Add referral earning record
        const { error: referralError } = await supabase
          .from('referral_earnings')
          .insert({
            referrer_id: payment.referred_by,
            referred_user_id: authData.user.id,
            amount: referralBonus,
            is_withdrawable: true,
          });

        if (referralError) {
          console.error('Error creating referral earning:', referralError);
        }

        // Update referrer's balance
        const { error: referrerUpdateError } = await supabase.rpc('increment_balance', {
          user_id: payment.referred_by,
          amount: referralBonus,
        });

        if (referrerUpdateError) {
          // Fallback: manually update
          const { data: referrer } = await supabase
            .from('profiles')
            .select('approved_balance, total_earnings')
            .eq('id', payment.referred_by)
            .single();

          if (referrer) {
            await supabase
              .from('profiles')
              .update({
                approved_balance: (referrer.approved_balance || 0) + referralBonus,
                total_earnings: (referrer.total_earnings || 0) + referralBonus,
              })
              .eq('id', payment.referred_by);
          }
        }

        console.log('Referral bonus processed');
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'IPN processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('IPN Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
