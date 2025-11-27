import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PaymentPending = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<"pending" | "completed" | "failed">("pending");
  const merchantReference = location.state?.merchantReference;

  useEffect(() => {
    if (!merchantReference) {
      toast.error("Invalid payment session");
      navigate("/auth/signup");
      return;
    }

    // Poll for payment status
    const checkPaymentStatus = async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("payment_status")
        .eq("merchant_reference", merchantReference)
        .single();

      if (!error && data) {
        if (data.payment_status === "completed") {
          setStatus("completed");
          localStorage.removeItem("pending_registration");
          
          setTimeout(() => {
            toast.success("Registration complete! Please log in.");
            navigate("/auth/login");
          }, 2000);
        } else if (data.payment_status === "failed") {
          setStatus("failed");
        }
      }
    };

    // Check immediately
    checkPaymentStatus();

    // Then poll every 3 seconds for up to 5 minutes
    const interval = setInterval(checkPaymentStatus, 3000);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (status === "pending") {
        setStatus("failed");
      }
    }, 300000); // 5 minutes

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [merchantReference, navigate]);

  if (status === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-secondary mb-2">Processing Payment</h1>
          <p className="text-muted-foreground mb-4">
            Please wait while we confirm your payment. This may take a few moments.
          </p>
          <p className="text-sm text-muted-foreground">
            Do not close this page or refresh the browser.
          </p>
        </div>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-secondary mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground mb-4">
            Your account has been created successfully. You can now log in to start earning.
          </p>
          <Button
            onClick={() => navigate("/auth/login")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-secondary mb-2">Payment Failed</h1>
        <p className="text-muted-foreground mb-4">
          We couldn't confirm your payment. Please try again or contact support if the problem persists.
        </p>
        <div className="space-y-2">
          <Button
            onClick={() => navigate("/auth/signup")}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/auth/login")}
            className="w-full"
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPending;
