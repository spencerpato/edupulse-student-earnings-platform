import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import noSurveysIllustration from "@/assets/no-surveys-illustration.png";

interface Survey {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  time_limit_minutes: number;
  expires_at: string | null;
}

const Surveys = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [limitReached, setLimitReached] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSurveys();
    }
  }, [user]);

  const fetchSurveys = async () => {
    if (!user) return;
    setLoading(true);
    setLimitReached(false);
    setCooldownActive(false);

    // Check how many surveys the user has completed today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const { data: todayResponses } = await supabase
      .from("survey_responses")
      .select("id, created_at")
      .eq("user_id", user.id)
      .gte("created_at", startOfToday.toISOString())
      .lte("created_at", endOfToday.toISOString());

    if (todayResponses && todayResponses.length >= 5) {
      setLimitReached(true);
      setSurveys([]);
      setLoading(false);
      return;
    }

    // Check if we have cached surveys that haven't been submitted yet
    const cachedSurveys = localStorage.getItem("active_surveys");
    const lastFetchTime = localStorage.getItem("survey_last_fetch");
    
    if (cachedSurveys && lastFetchTime) {
      const parsedSurveys: Survey[] = JSON.parse(cachedSurveys);
      const timeSinceFetch = (Date.now() - Number(lastFetchTime)) / (1000 * 60 * 60);
      
      // If less than 3 hours since fetch, use cached surveys
      if (timeSinceFetch < 3 && parsedSurveys.length > 0) {
        // Verify user hasn't completed these yet
        const { data: completed } = await supabase
          .from("survey_responses")
          .select("survey_id")
          .eq("user_id", user.id);
        
        if (completed) {
          const completedIds = new Set(completed.map((r) => r.survey_id));
          const stillAvailable = parsedSurveys.filter((s) => !completedIds.has(s.id));
          
          if (stillAvailable.length > 0) {
            setSurveys(stillAvailable);
            setLoading(false);
            return;
          }
        }
      }
    }
    
    // Enforce cooldown for fetching NEW surveys (3 hours minimum)
    if (lastFetchTime) {
      const diffHours = (Date.now() - Number(lastFetchTime)) / (1000 * 60 * 60);
      if (diffHours < 3) {
        setCooldownActive(true);
        setSurveys([]);
        localStorage.removeItem("active_surveys"); // Clear cache if cooldown active
        setLoading(false);
        return;
      }
    }

    // Fetch all active surveys
    const { data: surveysData } = await supabase
      .from("surveys")
      .select("*")
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

    // Only show up to 2 surveys at a time
    const limitedSurveys = availableSurveys.slice(0, 2);
    setSurveys(limitedSurveys);

    if (limitedSurveys.length > 0) {
      // Cache these surveys and timestamp
      localStorage.setItem("active_surveys", JSON.stringify(limitedSurveys));
      localStorage.setItem("survey_last_fetch", Date.now().toString());
      setCooldownActive(false);
    } else {
      localStorage.removeItem("active_surveys");
    }

    setLoading(false);
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return "No deadline";
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? "s" : ""} left`;
    if (hours > 0) return `Ends in ${hours} hour${hours > 1 ? "s" : ""}`;
    return "Ending soon";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Surveys" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">Loading surveys...</div>
        </div>
      </div>
    );
  }

  if (surveys.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <AppHeader title="Surveys" />
        
        <div className="max-w-7xl mx-auto p-4 flex items-center justify-center min-h-[60vh]">
          <div className="bg-card rounded-3xl p-8 max-w-md w-full text-center border border-border">
            <div className="bg-[#F5DEB3] rounded-2xl p-8 mb-6">
              <img 
                src={noSurveysIllustration} 
                alt="No surveys" 
                className="w-full h-auto object-contain"
              />
            </div>
            
            <h3 className="text-2xl font-bold text-secondary mb-3">
              No Surveys Available Right Now
            </h3>
            <p className="text-muted-foreground mb-6">
              {limitReached
                ? "You've reached today's maximum of 5 tasks. New surveys will be available tomorrow."
                : cooldownActive
                  ? "You've completed all available surveys for now. Please check again in a few hours for new tasks."
                  : "We're always looking for new opportunities for you. Please check again later!"}
            </p>
            
            <Button
              onClick={fetchSurveys}
              className="w-full h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppHeader title="Available Surveys" />
      
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {surveys.map((survey) => (
          <div key={survey.id} className="bg-card rounded-2xl p-6 border border-border">
            <div className="mb-4">
              <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary font-bold rounded-full text-sm mb-3">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(survey.reward_amount)}
              </span>
              <h3 className="text-xl font-bold text-secondary mb-2">{survey.title}</h3>
              <p className="text-muted-foreground text-sm mb-3">{survey.description}</p>
              
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="h-4 w-4" />
                <span>{getTimeRemaining(survey.expires_at)}</span>
              </div>
            </div>
            
            <Button
              onClick={() => navigate(`/surveys/${survey.id}`)}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              Start Task
            </Button>
          </div>
        ))}
      </div>

      <MobileNav />
    </div>
  );
};

export default Surveys;
