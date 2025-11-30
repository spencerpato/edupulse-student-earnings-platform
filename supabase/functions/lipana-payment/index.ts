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
    const { merchantReference, amount, phoneNumber, email, fullName, password, referredBy } = await req.json();

    const lipanaSecretKey = Deno.env.get('LIPANA_SECRET_KEY');

    if (!lipanaSecretKey) {
      throw new Error('Lipana credentials not configured');
    }

    console.log('Initiating Lipana payment:', { merchantReference, amount, phoneNumber });

    // Initiate STK push using Lipana.dev
    const lipanaResponse = await fetch('https://api.lipana.dev/v1/payments/stk-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lipanaSecretKey}`,
      },
      body: JSON.stringify({
        phone: phoneNumber,
        amount: amount,
        reference: merchantReference,
        description: 'EduPulse Registration (Refundable)',
      }),
    });

    if (!lipanaResponse.ok) {
      const errorText = await lipanaResponse.text();
      console.error('Lipana API error:', errorText);
      throw new Error('Failed to initiate Lipana payment');
    }

    const lipanaResult = await lipanaResponse.json();
    console.log('Lipana response:', lipanaResult);

    // Check if payment was successful
    if (lipanaResult.status === 'success' || lipanaResult.success) {
      console.log('Payment initiated successfully, processing account creation...');

      // Initialize Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Get registration fee from system settings
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

      // Update payment record
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          lipana_transaction_id: lipanaResult.transaction_id || lipanaResult.reference,
          payment_status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('merchant_reference', merchantReference);

      if (updateError) {
        console.error('Error updating payment:', updateError);
      }

      // Create user account
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
        throw new Error('Failed to create user account');
      }

      console.log('User created:', authData.user.id);

      // Add registration fee to their wallet as refundable credit
      const { error: walletError } = await supabase
        .from('profiles')
        .update({
          approved_balance: registrationFee,
          total_earnings: registrationFee,
        })
        .eq('id', authData.user.id);

      if (walletError) {
        console.error('Error updating wallet:', walletError);
      }

      // Handle referral bonus if applicable
      if (referredBy) {
        const referralBonus = registrationFee * 0.25; // 25% of registration fee

        // Add referral earning record
        const { error: referralError } = await supabase
          .from('referral_earnings')
          .insert({
            referrer_id: referredBy,
            referred_user_id: authData.user.id,
            amount: referralBonus,
            is_withdrawable: true,
          });

        if (referralError) {
          console.error('Error creating referral earning:', referralError);
        }

        // Update referrer's balance
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

      // Sign in the user to get session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError || !signInData.session) {
        console.error('Error signing in user:', signInError);
        // User created successfully but auto-login failed - return success anyway
        return new Response(
          JSON.stringify({ 
            success: true,
            autoLoginFailed: true,
            message: 'Payment successful and account created. Please log in manually.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          session: signInData.session,
          message: 'Payment successful and account created'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error(lipanaResult.message || 'Payment failed');
    }
  } catch (error) {
    console.error('Lipana payment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
