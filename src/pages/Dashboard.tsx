import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, CheckCircle2, GraduationCap, Utensils, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import QualityScoreBadge from "@/components/dashboard/QualityScoreBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import defaultAvatar from "@/assets/default-avatar.png";

interface Profile {
  full_name: string;
  quality_score: number;
  quality_status: "good" | "caution" | "restricted";
  approved_balance: number;
  completed_surveys: number;
  avatar_url: string | null;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  time_limit_minutes: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSurveys();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, quality_score, quality_status, approved_balance, completed_surveys, avatar_url")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      setProfile(data);
    }
    setLoading(false);
  };

  const fetchSurveys = async () => {
    if (!user) return;

    // Check how many surveys the user has completed today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const { data: todayResponses } = await supabase
      .from("survey_responses")
      .select("id")
      .eq("user_id", user.id)
      .gte("created_at", startOfToday.toISOString())
      .lte("created_at", endOfToday.toISOString());

    if (todayResponses && todayResponses.length >= 5) {
      setSurveys([]);
      return;
    }

    // Enforce cooldown
    const lastFetch = localStorage.getItem("survey_last_fetch");
    if (lastFetch) {
      const diffHours = (Date.now() - Number(lastFetch)) / (1000 * 60 * 60);
      if (diffHours < 3) {
        setSurveys([]);
        return;
      }
    }

    // Fetch all active surveys
    const { data: surveysData } = await supabase
      .from("surveys")
      .select("id, title, description, reward_amount, time_limit_minutes")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    let availableSurveys: Survey[] = surveysData || [];

    // Remove surveys the user has already completed
    const { data: completed } = await supabase
      .from("survey_responses")
      .select("survey_id")
      .eq("user_id", user.id);

    if (completed) {
      const completedIds = new Set(completed.map((r) => r.survey_id));
      availableSurveys = availableSurveys.filter((s) => !completedIds.has(s.id));
    }

    // Only show up to 2 surveys
    const limitedSurveys = availableSurveys.slice(0, 2);
    setSurveys(limitedSurveys);
  };

  const getFirstName = () => profile?.full_name.split(" ")[0] || "User";

  const getSurveyIcon = (index: number) => {
    const icons = [GraduationCap, Utensils, BookOpen];
    return icons[index % icons.length];
  };

  if (loading || !profile) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppHeader title="Dashboard" />
      
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-secondary">Hi, {getFirstName()}</h2>
          <Avatar className="h-12 w-12 ring-2 ring-primary/20">
            <AvatarImage src={profile.avatar_url || defaultAvatar} />
            <AvatarFallback>{getFirstName()[0]}</AvatarFallback>
          </Avatar>
        </div>

        {/* Wallet Balance */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Wallet className="h-5 w-5" />
            <span className="font-medium">Wallet Balance</span>
          </div>
          <div className="text-4xl font-bold text-secondary mb-1">
            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(profile.approved_balance)}
          </div>
          <div className="text-sm text-muted-foreground">Approved Funds</div>
        </div>

        {/* Quality Score */}
        <QualityScoreBadge score={profile.quality_score} status={profile.quality_status} />

        {/* Completed Tasks */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Completed Tasks</span>
          </div>
          <div className="text-4xl font-bold text-secondary mb-1">{profile.completed_surveys}</div>
          <div className="text-sm text-muted-foreground">Total Surveys</div>
        </div>

        {/* Active Surveys */}
        <div>
          <h3 className="text-xl font-bold text-secondary mb-4">Active Surveys</h3>
          <div className="space-y-3">
            {surveys.map((survey, index) => {
              const Icon = getSurveyIcon(index);
              return (
                <div key={survey.id} className="bg-card rounded-2xl p-4 border border-border">
                  <div className="flex items-start gap-4">
                    <div className="bg-muted rounded-xl p-3">
                      <Icon className="h-6 w-6 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-secondary mb-1">{survey.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">Est. {survey.time_limit_minutes} min</p>
                      <div className="flex items-center justify-between">
                        <span className="text-primary font-bold">
                          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(survey.reward_amount)} Reward
                        </span>
                        <Button
                          onClick={() => navigate(`/surveys/${survey.id}`)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          Start
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
};

export default Dashboard;
