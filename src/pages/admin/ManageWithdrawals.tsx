import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  payment_method: string;
  payment_details: any;
  profiles: {
    full_name: string;
    email: string;
  };
}

const ManageWithdrawals = () => {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    const { data, error } = await supabase
      .from("withdrawals")
      .select("*, profiles!withdrawals_user_id_fkey(full_name, email)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch withdrawals");
      return;
    }

    setWithdrawals(data as any || []);
  };

  const updateWithdrawalStatus = async (id: string, status: "approved" | "rejected", rejectionReason?: string) => {
    const { error } = await supabase
      .from("withdrawals")
      .update({
        status,
        processed_at: new Date().toISOString(),
        processed_by: user?.id,
        rejection_reason: rejectionReason || null,
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update withdrawal");
      return;
    }

    toast.success(`Withdrawal ${status}`);
    fetchWithdrawals();
  };

  const approveWithdrawal = (id: string) => {
    updateWithdrawalStatus(id, "approved");
  };

  const rejectWithdrawal = (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (reason) {
      updateWithdrawalStatus(id, "rejected", reason);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-secondary">Manage Withdrawals</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          {withdrawals.map((withdrawal) => (
            <Card key={withdrawal.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div>
                      <p className="font-semibold">{withdrawal.profiles.full_name}</p>
                      <p className="text-sm text-muted-foreground">{withdrawal.profiles.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-semibold ml-2">
                          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(withdrawal.amount)}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Method:</span>
                        <span className="ml-2">{withdrawal.payment_method}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="ml-2">{new Date(withdrawal.created_at).toLocaleDateString()}</span>
                      </p>
                    </div>
                    <Badge
                      variant={
                        withdrawal.status === "approved"
                          ? "default"
                          : withdrawal.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {withdrawal.status}
                    </Badge>
                  </div>
                  {withdrawal.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveWithdrawal(withdrawal.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectWithdrawal(withdrawal.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ManageWithdrawals;
