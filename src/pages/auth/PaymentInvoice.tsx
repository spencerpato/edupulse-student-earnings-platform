import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CreditCard, Mail, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const phoneSchema = z.string().regex(/^(254|0)[17]\d{8}$/, "Enter valid M-Pesa number (e.g., 0712345678 or 254712345678)");

const PaymentInvoice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registrationFee, setRegistrationFee] = useState(100);

  const registrationData = location.state as {
    fullName: string;
    email: string;
    password: string;
    referredBy?: string;
    timestamp?: number;
  };

  useEffect(() => {
    // Check if registration data exists and is not expired
    if (!registrationData || Date.now() - (registrationData.timestamp || 0) > 10 * 60 * 1000) {
      toast.error("Registration session expired. Please sign up again.");
      navigate("/auth/signup");
      return;
    }

    // Fetch current registration fee
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
        // Keep default value of 100 if fetch fails
      }
    };

    fetchRegistrationFee();
  }, [registrationData, navigate]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate phone number
      phoneSchema.parse(phoneNumber);

      // Generate merchant reference
      const merchantReference = `EDUPULSE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Store payment record in database
      const { error: dbError } = await supabase.from("payments").insert({
        email: registrationData.email,
        full_name: registrationData.fullName,
        phone_number: phoneNumber,
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

      // Store registration data and merchant reference in localStorage for the callback
      localStorage.setItem("pending_registration", JSON.stringify({
        ...registrationData,
        merchantReference,
      }));

      // Call edge function to get Pesapal checkout URL
      const { data, error: checkoutError } = await supabase.functions.invoke('pesapal-checkout', {
        body: {
          merchantReference,
          amount: registrationFee,
          phoneNumber,
          email: registrationData.email,
          fullName: registrationData.fullName,
        },
      });

      if (checkoutError || !data?.redirectUrl) {
        console.error("Checkout error:", checkoutError);
        toast.error("Failed to initiate payment. Please try again.");
        setLoading(false);
        return;
      }

      console.log('Redirecting to Pesapal:', data.redirectUrl);
      
      // Redirect to Pesapal checkout
      window.location.href = data.redirectUrl;

    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        console.error("Payment error:", err);
        toast.error("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!registrationData) {
    return null;
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
                <li>You'll be redirected to Pesapal for secure payment</li>
                <li>KES {registrationFee} will be added to your wallet immediately</li>
                <li>This amount is fully refundable and withdrawable</li>
                <li>Your account will be created after payment confirmation</li>
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
