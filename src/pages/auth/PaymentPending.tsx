import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const POLL_INTERVAL = 3000;
const MAX_POLL_DURATION = 180000;

const PaymentPending = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<"pending" | "completed" | "failed" | "expired">("pending");
  const [timeRemaining, setTimeRemaining] = useState(Math.floor(MAX_POLL_DURATION / 1000));
  const pollCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  
  const merchantReference = location.state?.merchantReference;
  const paymentId = location.state?.paymentId;

  const verifyPayment = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: {
          merchantReference,
          paymentId,
        },
      });

      if (error) {
        console.error('Verification error:', error);
        return 'pending';
      }

      console.log('Verification response:', data);

      if (data.status === 'completed') {
        return 'completed';
      } else if (data.status === 'failed') {
        return 'failed';
      }
      
      return 'pending';
    } catch (err) {
      console.error('Verification error:', err);
      return 'pending';
    }
  }, [merchantReference, paymentId]);

  useEffect(() => {
    if (!merchantReference) {
      toast.error("Invalid payment session");
      navigate("/auth/signup");
      return;
    }

    let intervalId: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;
    let timerIntervalId: NodeJS.Timeout;

    const checkPayment = async () => {
      pollCountRef.current += 1;
      console.log(`Polling attempt ${pollCountRef.current}...`);
      
      const result = await verifyPayment();
      
      if (result === 'completed') {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        clearInterval(timerIntervalId);
        setStatus('completed');
        toast.success("Payment successful! Your account has been created.");
        
        setTimeout(() => {
          navigate("/auth/login");
        }, 2000);
        return;
      }
      
      if (result === 'failed') {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        clearInterval(timerIntervalId);
        setStatus('failed');
        toast.error("Payment not completed. Please try again.");
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed >= MAX_POLL_DURATION) {
        clearInterval(intervalId);
        clearInterval(timerIntervalId);
        setStatus('expired');
        toast.error("Payment session expired. Please try again.");
      }
    };

    checkPayment();

    intervalId = setInterval(checkPayment, POLL_INTERVAL);

    timerIntervalId = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, Math.floor((MAX_POLL_DURATION - elapsed) / 1000));
      setTimeRemaining(remaining);
    }, 1000);

    timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      clearInterval(timerIntervalId);
      if (status === "pending") {
        setStatus("expired");
        toast.error("Payment session expired. Please try again.");
      }
    }, MAX_POLL_DURATION);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      clearInterval(timerIntervalId);
    };
  }, [merchantReference, paymentId, navigate, verifyPayment, status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-secondary mb-2">Waiting for Payment</h1>
          <p className="text-muted-foreground mb-4">
            Please complete the M-Pesa payment on your phone. Enter your PIN when prompted.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
            <Clock className="h-4 w-4" />
            <span>Time remaining: {formatTime(timeRemaining)}</span>
          </div>
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

  if (status === "expired") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Clock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-secondary mb-2">Payment Session Expired</h1>
          <p className="text-muted-foreground mb-4">
            We didn't receive your payment confirmation in time. Please try again.
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
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-secondary mb-2">Payment Not Completed</h1>
        <p className="text-muted-foreground mb-4">
          The payment was not completed. Please try again.
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
