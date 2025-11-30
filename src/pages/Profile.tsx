import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Bell, Shield, HelpCircle, LogOut, Copy, Share2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import defaultAvatar from "@/assets/default-avatar.png";

interface Profile {
  full_name: string;
  email: string;
  referral_code: string;
  avatar_url: string | null;
}

interface ReferralEarnings {
  total: number;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [referralEarnings, setReferralEarnings] = useState(0);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchReferralEarnings();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, referral_code, avatar_url")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const fetchReferralEarnings = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("referral_earnings")
      .select("amount")
      .eq("referrer_id", user.id);

    if (data) {
      const total = data.reduce((sum, item) => sum + Number(item.amount), 0);
      setReferralEarnings(total);
    }
  };

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast.success("Referral code copied!");
    }
  };

  const shareReferralLink = async () => {
    const referralLink = `${window.location.origin}/ref/${profile?.referral_code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join EduPulse",
          text: "Earn money by completing university research surveys!",
          url: referralLink,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied!");
    }
  };

  if (!profile) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppHeader title="My Profile" />
      
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Profile Card */}
        <div className="bg-card rounded-2xl p-8 text-center border border-border">
          <Avatar className="h-24 w-24 mx-auto mb-4 ring-4 ring-primary/20">
            <AvatarImage src={profile.avatar_url || defaultAvatar} />
            <AvatarFallback className="text-2xl">{profile.full_name[0]}</AvatarFallback>
          </Avatar>
          
          <h2 className="text-2xl font-bold text-secondary mb-1">{profile.full_name}</h2>
          <p className="text-muted-foreground mb-4">{profile.email}</p>
          
          <Button
            onClick={() => navigate("/profile/edit")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Edit Profile
          </Button>
        </div>

        {/* Refer a Friend */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <h3 className="text-lg font-bold text-secondary mb-4">Refer a Friend</h3>
          
          <div className="bg-muted rounded-xl p-4 mb-3 flex items-center justify-between">
            <span className="font-mono font-bold text-secondary text-lg">
              {profile.referral_code}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyReferralCode}
              className="text-primary"
            >
              <Copy className="h-5 w-5" />
            </Button>
          </div>
          
            <div className="flex items-center justify-between mb-3">
              <div>
              <div className="text-sm text-muted-foreground">Referral Earnings:</div>
                <div className="text-2xl font-bold text-secondary">
                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(referralEarnings)}
                </div>
              </div>
            <Button
              onClick={shareReferralLink}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Your Code
            </Button>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button
            onClick={() => navigate("/profile/edit")}
            className="w-full flex items-center gap-4 p-5 hover:bg-muted transition-colors"
          >
            <div className="bg-muted rounded-xl p-2">
              <User className="h-5 w-5 text-secondary" />
            </div>
            <span className="flex-1 text-left font-medium text-secondary">Account Settings</span>
          </button>
          
          <div className="border-t border-border">
            <button className="w-full flex items-center gap-4 p-5 hover:bg-muted transition-colors">
              <div className="bg-muted rounded-xl p-2">
                <Bell className="h-5 w-5 text-secondary" />
              </div>
              <span className="flex-1 text-left font-medium text-secondary">Notification Settings</span>
            </button>
          </div>
          
          <div className="border-t border-border">
            <button className="w-full flex items-center gap-4 p-5 hover:bg-muted transition-colors">
              <div className="bg-muted rounded-xl p-2">
                <Shield className="h-5 w-5 text-secondary" />
              </div>
              <span className="flex-1 text-left font-medium text-secondary">Privacy Policy</span>
            </button>
          </div>
          
          <div className="border-t border-border">
            <button className="w-full flex items-center gap-4 p-5 hover:bg-muted transition-colors">
              <div className="bg-muted rounded-xl p-2">
                <HelpCircle className="h-5 w-5 text-secondary" />
              </div>
              <span className="flex-1 text-left font-medium text-secondary">Help & Support</span>
            </button>
          </div>
        </div>

        {/* Logout */}
        <Button
          onClick={signOut}
          variant="ghost"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Logout
        </Button>
      </div>

      <MobileNav />
    </div>
  );
};

export default Profile;
