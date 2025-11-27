import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const ReferralRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const handleReferral = async () => {
      if (!code) {
        toast.error("Invalid referral link");
        navigate("/auth/signup");
        return;
      }

      // Find the referrer by referral code
      const { data: referrer, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("referral_code", code)
        .single();

      if (error || !referrer) {
        toast.error("Invalid referral code");
        navigate("/auth/signup");
        return;
      }

      // Store referral info and redirect to signup
      toast.success(`You're signing up via ${referrer.full_name}'s referral! You'll both earn bonuses.`);
      navigate("/auth/signup", {
        state: { referredBy: referrer.id }
      });
    };

    handleReferral();
  }, [code, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Processing referral link...</p>
      </div>
    </div>
  );
};

export default ReferralRedirect;
