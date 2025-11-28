import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Wallet, AlertTriangle, TrendingUp, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminDashboard = () => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSurveys: 0,
    pendingWithdrawals: 0,
    heldResponses: 0,
    totalPayouts: 0,
    averageQualityScore: 0,
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [users, surveys, withdrawals, responses, profiles] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("surveys").select("*", { count: "exact", head: true }),
      supabase.from("withdrawals").select("amount").eq("status", "pending"),
      supabase.from("survey_responses").select("*", { count: "exact", head: true }).eq("is_flagged", true).is("is_approved", null),
      supabase.from("profiles").select("quality_score, approved_balance"),
    ]);

    const totalPayouts = profiles.data?.reduce((sum, p) => sum + (Number(p.approved_balance) || 0), 0) || 0;
    const avgScore = profiles.data?.reduce((sum, p) => sum + (p.quality_score || 0), 0) / (profiles.data?.length || 1);

    setStats({
      totalUsers: users.count || 0,
      totalSurveys: surveys.count || 0,
      pendingWithdrawals: withdrawals.data?.length || 0,
      heldResponses: responses.count || 0,
      totalPayouts,
      averageQualityScore: Math.round(avgScore || 0),
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-secondary">Admin Dashboard</h1>
            <Button variant="outline" onClick={() => navigate("/")}>
              Exit Admin
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Surveys</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSurveys}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingWithdrawals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Held Responses</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.heldResponses}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ksh {stats.totalPayouts.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageQualityScore}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => navigate("/admin/surveys")}>
            <CardHeader>
              <CardTitle>Manage Surveys</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Create, edit, and delete surveys</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => navigate("/admin/responses")}>
            <CardHeader>
              <CardTitle>Review Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Approve or reject flagged responses</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => navigate("/admin/withdrawals")}>
            <CardHeader>
              <CardTitle>Manage Withdrawals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Process withdrawal requests</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => navigate("/admin/users")}>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Manage users and fraud flags</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => navigate("/admin/settings")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Configure platform settings</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
