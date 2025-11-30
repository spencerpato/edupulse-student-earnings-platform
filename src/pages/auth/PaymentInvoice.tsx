import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CreditCard, Mail, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import PaymentStatus from "@/components/payment/PaymentStatus";

const phoneSchema = z.string().regex(/^(254|0)[17]\d{8}$/, "Enter valid M-Pesa number (e.g., 0712345678 or 254712345678)");

const formatPhoneNumber = (phone: string): string => {
  let formatted = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
  if (formatted.startsWith('0')) {
    formatted = '254' + formatted.substring(1);
  }
  return formatted;
};

type PaymentStatusType = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'CANCELLED' | 'FAILED' | 'EXPIRED' | 'ERROR' | 'CHECKING';

const POLL_INTERVAL = 2000;
const MAX_POLL_TIME = 30000;
const FINAL_STATUSES = ['SUCCESS', 'CANCELLED', 'FAILED', 'EXPIRED', 'ERROR'];

const PaymentInvoice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [registrationFee, setRegistrationFee] = useState(100);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const paymentDataRef = useRef<{ merchantReference: string; paymentId: string } | null>(null);

  const registrationData = location.state as {
    fullName: string;
    email: string;
    password: string;
    referredBy?: string;
    timestamp?: number;
  };

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const verifyPayment = useCallback(async () => {
    if (!paymentDataRef.current) return;

    const elapsed = Date.now() - startTimeRef.current;
    
    if (elapsed >= MAX_POLL_TIME) {
      stopPolling();
      setPaymentStatus('EXPIRED');
      setStatusMessage('Payment session expired. Please try again.');
      return;
    }

    try {
      const { data, error: verifyError } = await supabase.functions.invoke('verify-payment', {
        body: {
          merchantReference: paymentDataRef.current.merchantReference,
          paymentId: paymentDataRef.current.paymentId,
        },
      });

      console.log('Verification response:', data);

      if (verifyError) {
        console.error('Verification error:', verifyError);
        return;
      }

      const status = data?.status as PaymentStatusType;

      if (status === 'SUCCESS' && data?.session) {
        stopPolling();
        setPaymentStatus('SUCCESS');
        setStatusMessage('Payment successful! Logging you in...');
        
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        
        localStorage.removeItem("pending_registration");
        
        setTimeout(() => {
          navigate("/");
        }, 1500);
        return;
      }

      if (status === 'SUCCESS' && data?.autoLoginFailed) {
        stopPolling();
        setPaymentStatus('SUCCESS');
        setStatusMessage('Payment successful! Please log in to continue.');
        localStorage.removeItem("pending_registration");
        return;
      }

      if (FINAL_STATUSES.includes(status)) {
        stopPolling();
        setPaymentStatus(status);
        setStatusMessage(data?.message || '');
        return;
      }

      if (status === 'PROCESSING') {
        setPaymentStatus('PROCESSING');
        setStatusMessage('Payment is being processed...');
      } else if (status === 'PENDING') {
        setPaymentStatus('PENDING');
        setStatusMessage('Waiting for payment...');
      }

    } catch (err) {
      console.error('Verification poll error:', err);
    }
  }, [navigate, stopPolling]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  useEffect(() => {
    if (!registrationData || Date.now() - (registrationData.timestamp || 0) > 10 * 60 * 1000) {
      toast.error("Registration session expired. Please sign up again.");
      navigate("/auth/signup");
      return;
    }

    const fetchRegistrationFee = async () => {
      try {
        const { data, error } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "registration_fee")
          .single();

        if (error) throw error;
        setRegistrationFee(Number(data.value));
      } catch (error) {
        console.error("Error fetching registration fee:", error);
      }
    };

    fetchRegistrationFee();
  }, [registrationData, navigate]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    stopPolling();

    try {
      phoneSchema.parse(phoneNumber);

      const formattedPhone = formatPhoneNumber(phoneNumber);
      const merchantReference = `EDUPULSE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { error: dbError } = await supabase.from("payments").insert({
        email: registrationData.email,
        full_name: registrationData.fullName,
        phone_number: formattedPhone,
        amount: registrationFee,
        merchant_reference: merchantReference,
        payment_status: "pending",
        referred_by: registrationData.referredBy || null,
      });

      if (dbError) {
        console.error("Database error:", dbError);
        toast.error("Failed to initialize payment. Please try again.");
        setLoading(false);
        return;
      }

      setPaymentStatus('CHECKING');
      setStatusMessage('Sending M-Pesa prompt to your phone...');

      const { data, error: paymentError } = await supabase.functions.invoke('lipana-payment', {
        body: {
          merchantReference,
          amount: registrationFee,
          phoneNumber: formattedPhone,
          email: registrationData.email,
          fullName: registrationData.fullName,
          password: registrationData.password,
          referredBy: registrationData.referredBy || null,
        },
      });

      console.log('Payment initiation response:', data);

      if (paymentError || !data?.success) {
        console.error("Payment error:", paymentError || data?.error);
        setPaymentStatus('ERROR');
        setStatusMessage(data?.error || 'Failed to send M-Pesa prompt. Please try again.');
        return;
      }

      paymentDataRef.current = {
        merchantReference,
        paymentId: data.paymentId,
      };

      setPaymentStatus('PENDING');
      setStatusMessage('Please enter your M-Pesa PIN on your phone to complete the payment.');
      
      startTimeRef.current = Date.now();
      pollingRef.current = setInterval(verifyPayment, POLL_INTERVAL);
      
      verifyPayment();

    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        setPaymentStatus(null);
        setLoading(false);
      } else {
        console.error("Payment error:", err);
        setPaymentStatus('ERROR');
        setStatusMessage('An error occurred. Please try again.');
      }
    }
  };

  const handleRetry = () => {
    stopPolling();
    paymentDataRef.current = null;
    setPaymentStatus(null);
    setStatusMessage("");
    setLoading(false);
    setPhoneNumber("");
  };

  const handleLogin = () => {
    navigate("/auth/login");
  };

  const handleContinue = () => {
    navigate("/");
  };

  if (!registrationData) {
    return null;
  }

  if (paymentStatus) {
    return (
      <PaymentStatus
        status={paymentStatus}
        message={statusMessage}
        onRetry={handleRetry}
        onLogin={paymentStatus === 'SUCCESS' ? handleContinue : handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-secondary mb-2">Registration Payment</h1>
          <p className="text-muted-foreground">Complete your registration with a refundable KES {registrationFee} deposit</p>
        </div>

        <div className="bg-card rounded-2xl p-8 border border-border">
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium text-secondary">{registrationData.fullName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-secondary">{registrationData.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
              <CreditCard className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold text-primary">KES {registrationFee}</p>
                <p className="text-xs text-muted-foreground mt-1">Refundable registration deposit</p>
              </div>
            </div>
          </div>

          <form onSubmit={handlePayment} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-secondary font-medium">M-Pesa Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0712345678 or 254712345678"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setError("");
                  }}
                  className="pl-10 h-12"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-medium text-secondary">What happens next:</p>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>You'll receive an M-Pesa prompt on your phone</li>
                <li>Enter your M-Pesa PIN to complete payment</li>
                <li>KES {registrationFee} will be added to your wallet</li>
                <li>This amount is fully refundable and withdrawable</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={loading}
            >
              {loading ? "Processing..." : "Pay Now with M-Pesa"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12"
              onClick={() => navigate("/auth/signup")}
              disabled={loading}
            >
              Back to Registration
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentInvoice;
