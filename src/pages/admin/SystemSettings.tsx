import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

export default function SystemSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [registrationFee, setRegistrationFee] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "registration_fee")
        .single();

      if (error) throw error;
      setRegistrationFee(String(data.value));
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    }
  };

  const handleSave = async () => {
    if (!registrationFee || isNaN(Number(registrationFee)) || Number(registrationFee) < 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .update({ 
          value: registrationFee,
          updated_at: new Date().toISOString() 
        })
        .eq("key", "registration_fee");

      if (error) throw error;

      toast.success("Registration fee updated successfully");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>
              Configure platform-wide settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="registrationFee">Registration Fee (KES)</Label>
              <Input
                id="registrationFee"
                type="number"
                min="0"
                step="1"
                value={registrationFee}
                onChange={(e) => setRegistrationFee(e.target.value)}
                placeholder="100"
              />
              <p className="text-sm text-muted-foreground">
                This amount will be charged during registration and credited to user's wallet as refundable balance.
                Referral bonus is calculated as 25% of this amount.
              </p>
            </div>

            <Button onClick={handleSave} disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
