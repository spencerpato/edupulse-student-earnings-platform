import { useEffect, useState } from "react";
import { CheckCircle, Clock, XCircle, ArrowUp, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


interface Withdrawal {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "held";
  created_at: string;
}

const Wallet = () => {
  const { user } = useAuth();
  const [approvedBalance, setApprovedBalance] = useState(0);
  const [heldBalance, setHeldBalance] = useState(0);
  const [hasWithdrawn, setHasWithdrawn] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWalletData();
      fetchWithdrawals();
    }
  }, [user]);

  const fetchWalletData = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("approved_balance, held_balance, has_withdrawn")
      .eq("id", user.id)
      .single();

    if (data) {
      const approved = Number(data.approved_balance) || 0;
      const held = Number(data.held_balance) || 0;
      setApprovedBalance(approved);
      setHeldBalance(held);
      setHasWithdrawn(!!data.has_withdrawn);
      setWithdrawAmount(approved);
    }
  };

  const fetchWithdrawals = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) {
      setWithdrawals(data);
    }
  };

  const handleWithdraw = async () => {
    if (!user) return;

    const amount = Number(withdrawAmount);
    const minimumFirstWithdrawal = 3100;

    if (!amount || amount <= 0) {
      toast.error("Please enter a valid withdrawal amount.");
      return;
    }

    if (amount > approvedBalance) {
      toast.error("You cannot withdraw more than your approved balance.");
      return;
    }

    if (!hasWithdrawn && amount < minimumFirstWithdrawal) {
      toast.error(`Your first withdrawal must be at least ${new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(minimumFirstWithdrawal)}. Future withdrawals will have no minimum amount.`);
      return;
    }

    setLoading(true);
    
    const { error } = await supabase
      .from("withdrawals")
      .insert({
        user_id: user.id,
        amount,
        status: "pending",
      });

    if (error) {
      toast.error("Failed to create withdrawal request");
    } else {
      toast.success("Withdrawal request submitted successfully");
      
      // Update has_withdrawn flag after the first successful request
      if (!hasWithdrawn) {
        await supabase
          .from("profiles")
          .update({ has_withdrawn: true })
          .eq("id", user.id);
      }
      
      await fetchWalletData();
      await fetchWithdrawals();
    }
    
    setLoading(false);
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      approved: {
        icon: CheckCircle,
        label: "Approved",
        className: "bg-success-light text-success",
      },
      pending: {
        icon: Clock,
        label: "Pending",
        className: "bg-warning-light text-warning",
      },
      rejected: {
        icon: XCircle,
        label: "Rejected",
        className: "bg-destructive/10 text-destructive",
      },
      held: {
        icon: Clock,
        label: "Held",
        className: "bg-warning-light text-warning",
      },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const totalBalance = approvedBalance + heldBalance;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppHeader title="Wallet & Withdraw" />
      
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Total Balance */}
        <div className="bg-card rounded-2xl p-6 text-center border border-border">
          <div className="text-muted-foreground mb-2">Total Balance</div>
          <div className="text-4xl font-bold text-secondary">
            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(totalBalance)}
          </div>
        </div>

        {/* Balance Breakdown */}
        <div className="space-y-3">
          <div className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-success-light rounded-xl p-2">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <div className="font-semibold text-secondary">Approved Balance</div>
                <div className="text-sm text-muted-foreground">Withdrawable</div>
              </div>
            </div>
            <div className="text-xl font-bold text-secondary">
              {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(approvedBalance)}
            </div>
          </div>

          {heldBalance > 0 && (
            <div className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-warning-light rounded-xl p-2">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <div className="font-semibold text-secondary">Held for Review</div>
                  <div className="text-sm text-muted-foreground">Pending validation</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xl font-bold text-secondary">
                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(heldBalance)}
                </div>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Withdraw Section */}
        <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-secondary">Withdraw Amount</span>
            <span className="text-sm text-muted-foreground">
              Available: {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(approvedBalance)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              className="flex-1 h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <Button
              onClick={handleWithdraw}
              disabled={loading || approvedBalance <= 0}
              className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {loading ? "Processing..." : "Withdraw"}
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {!hasWithdrawn
              ? `Your first withdrawal must be at least ${new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(3100)}. Future withdrawals will have no minimum amount.`
              : "You can withdraw any amount up to your approved balance."}
          </p>
        </div>

        {/* Withdrawal History */}
        <div>
          <h3 className="text-xl font-bold text-secondary mb-4">Withdrawal History</h3>
          <div className="space-y-3">
            {withdrawals.map((withdrawal) => {
              const statusConfig = getStatusConfig(withdrawal.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <div key={withdrawal.id} className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <ArrowUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-secondary">
                        {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(withdrawal.amount)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(withdrawal.created_at).toLocaleDateString("en-US", { 
                          year: "numeric", 
                          month: "long", 
                          day: "numeric" 
                        })}
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1",
                    statusConfig.className
                  )}>
                    <StatusIcon className="h-4 w-4" />
                    {statusConfig.label}
                  </span>
                </div>
              );
            })}
            
            {withdrawals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No withdrawal history yet
              </div>
            )}
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
};

export default Wallet;
