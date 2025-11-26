import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import defaultAvatar from "@/assets/default-avatar.png";
import { z } from "zod";

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  contactNumber: z.string().optional(),
});

const EditProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, contact_number, avatar_url")
      .eq("id", user.id)
      .single();

    if (data) {
      setFullName(data.full_name);
      setEmail(data.email);
      setContactNumber(data.contact_number || "");
      setAvatarUrl(data.avatar_url || "");
    }
  };

  const handleSave = async () => {
    setErrors({});
    setLoading(true);

    try {
      const validated = profileSchema.parse({ fullName, email, contactNumber });
      
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: validated.fullName,
          email: validated.email,
          contact_number: validated.contactNumber || null,
        })
        .eq("id", user?.id);

      if (error) {
        toast.error("Failed to update profile");
      } else {
        toast.success("Profile updated successfully");
        navigate("/profile");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: any = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0]] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center h-16 px-4 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-secondary ml-3">Edit Profile</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Avatar */}
        <div className="bg-card rounded-2xl p-8 text-center border border-border">
          <div className="relative inline-block">
            <Avatar className="h-32 w-32 ring-4 ring-primary/20">
              <AvatarImage src={avatarUrl || defaultAvatar} />
              <AvatarFallback className="text-3xl">{fullName[0]}</AvatarFallback>
            </Avatar>
            <button className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
              <Camera className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-card rounded-2xl p-6 border border-border space-y-6">
          <h3 className="text-lg font-bold text-secondary">Personal Information</h3>
          
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-secondary font-medium">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-12"
            />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-secondary font-medium">Email Address</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
                disabled
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">ⓘ</span>
              </button>
            </div>
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactNumber" className="text-secondary font-medium">
              Contact Number <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="contactNumber"
              type="tel"
              placeholder="e.g. (123) 456-7890"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="h-12"
            />
          </div>
        </div>

        {/* Security */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <h3 className="text-lg font-bold text-secondary mb-4">Security</h3>
          
          <button
            onClick={() => navigate("/profile/change-password")}
            className="w-full flex items-center justify-between p-4 hover:bg-muted rounded-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-secondary" />
              <span className="font-medium text-secondary">Change Password</span>
            </div>
            <span className="text-muted-foreground">›</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pb-6">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => navigate("/profile")}
            className="w-full h-12 text-muted-foreground"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
