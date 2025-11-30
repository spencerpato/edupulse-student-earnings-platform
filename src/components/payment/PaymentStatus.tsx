import { CheckCircle, XCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type PaymentStatusType = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'CANCELLED' | 'FAILED' | 'EXPIRED' | 'ERROR' | 'CHECKING';

interface PaymentStatusProps {
  status: PaymentStatusType;
  message?: string;
  onRetry?: () => void;
  onLogin?: () => void;
}

const statusConfig = {
  CHECKING: {
    icon: Loader2,
    iconClass: "text-primary animate-spin",
    bgClass: "bg-primary/10",
    title: "Checking Payment...",
    description: "Please enter your M-Pesa PIN on your phone to complete the payment.",
  },
  PENDING: {
    icon: Clock,
    iconClass: "text-amber-500",
    bgClass: "bg-amber-500/10",
    title: "Waiting for Payment...",
    description: "Please enter your M-Pesa PIN on your phone to complete the payment.",
  },
  PROCESSING: {
    icon: Loader2,
    iconClass: "text-blue-500 animate-spin",
    bgClass: "bg-blue-500/10",
    title: "Processing Payment...",
    description: "Your payment is being processed. Please wait.",
  },
  SUCCESS: {
    icon: CheckCircle,
    iconClass: "text-green-500",
    bgClass: "bg-green-500/10",
    title: "Payment Successful!",
    description: "Your account has been created and your wallet has been credited.",
  },
  CANCELLED: {
    icon: XCircle,
    iconClass: "text-gray-500",
    bgClass: "bg-gray-500/10",
    title: "Payment Cancelled",
    description: "The payment was cancelled. You can try again when ready.",
  },
  FAILED: {
    icon: XCircle,
    iconClass: "text-destructive",
    bgClass: "bg-destructive/10",
    title: "Payment Failed",
    description: "The payment could not be completed. Please try again.",
  },
  EXPIRED: {
    icon: AlertTriangle,
    iconClass: "text-amber-500",
    bgClass: "bg-amber-500/10",
    title: "Payment Session Expired",
    description: "The payment session has expired. Please try again.",
  },
  ERROR: {
    icon: XCircle,
    iconClass: "text-destructive",
    bgClass: "bg-destructive/10",
    title: "Something Went Wrong",
    description: "An error occurred while processing your payment.",
  },
};

export const PaymentStatus = ({ status, message, onRetry, onLogin }: PaymentStatusProps) => {
  const config = statusConfig[status];
  const IconComponent = config.icon;

  const showRetry = ['CANCELLED', 'FAILED', 'EXPIRED', 'ERROR'].includes(status);
  const showLogin = status === 'SUCCESS';
  const isLoading = ['CHECKING', 'PENDING', 'PROCESSING'].includes(status);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${config.bgClass} mb-6`}>
          <IconComponent className={`h-10 w-10 ${config.iconClass}`} />
        </div>
        
        <h1 className="text-2xl font-bold text-secondary mb-3">
          {config.title}
        </h1>
        
        <p className="text-muted-foreground mb-6">
          {message || config.description}
        </p>

        {isLoading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>This may take up to 30 seconds</span>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-left space-y-2">
              <p className="font-medium text-secondary">Tips:</p>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>Check your phone for the M-Pesa prompt</li>
                <li>Enter your M-Pesa PIN to complete</li>
                <li>Do not close this page</li>
              </ul>
            </div>
          </div>
        )}

        {showRetry && onRetry && (
          <div className="space-y-3">
            <Button
              onClick={onRetry}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              Try Again
            </Button>
          </div>
        )}

        {showLogin && onLogin && (
          <Button
            onClick={onLogin}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            Continue to Dashboard
          </Button>
        )}
      </div>
    </div>
  );
};

export default PaymentStatus;
