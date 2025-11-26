import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Survey {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  time_limit_minutes: number;
  is_active: boolean;
  total_questions: number;
}

const ManageSurveys = () => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    const { data, error } = await supabase
      .from("surveys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch surveys");
      return;
    }

    setSurveys(data || []);
  };

  const toggleSurveyStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("surveys")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update survey");
      return;
    }

    toast.success(`Survey ${!currentStatus ? "activated" : "deactivated"}`);
    fetchSurveys();
  };

  const deleteSurvey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this survey?")) return;

    const { error } = await supabase.from("surveys").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete survey");
      return;
    }

    toast.success("Survey deleted successfully");
    fetchSurveys();
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-secondary">Manage Surveys</h1>
            </div>
            <Button onClick={() => navigate("/admin/surveys/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Survey
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-4">
          {surveys.map((survey) => (
            <Card key={survey.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{survey.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{survey.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSurveyStatus(survey.id, survey.is_active)}
                    >
                      {survey.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteSurvey(survey.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Reward:</span>
                    <span className="font-semibold ml-2">Ksh {survey.reward_amount}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time Limit:</span>
                    <span className="font-semibold ml-2">{survey.time_limit_minutes} min</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className={`font-semibold ml-2 ${survey.is_active ? "text-green-600" : "text-red-600"}`}>
                      {survey.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ManageSurveys;
