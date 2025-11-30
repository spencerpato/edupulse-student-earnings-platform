import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import PaymentStatus from "@/components/payment/PaymentStatus";

const PaymentPending = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const merchantReference = location.state?.merchantReference;

  useEffect(() => {
    if (!merchantReference) {
      toast.error("Invalid payment session");
      navigate("/auth/signup");
    }
  }, [merchantReference, navigate]);

  const handleRetry = () => {
    navigate("/auth/signup");
  };

  if (!merchantReference) {
    return null;
  }

  return (
    <PaymentStatus
      status="EXPIRED"
      message="Your payment session has expired. Please try again."
      onRetry={handleRetry}
    />
  );
};

export default PaymentPending;
