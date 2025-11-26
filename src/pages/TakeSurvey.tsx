import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Clock } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  required: boolean;
  order_index: number;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  time_limit_minutes: number;
}

const TakeSurvey = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [startTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSurveyData();
  }, [id]);

  useEffect(() => {
    if (survey) {
      setTimeLeft(survey.time_limit_minutes * 60);
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [survey]);

  const fetchSurveyData = async () => {
    const { data: surveyData, error: surveyError } = await supabase
      .from("surveys")
      .select("*")
      .eq("id", id)
      .single();

    if (surveyError || !surveyData) {
      toast.error("Survey not found");
      navigate("/surveys");
      return;
    }

    setSurvey(surveyData);

    const { data: questionsData, error: questionsError } = await supabase
      .from("survey_questions")
      .select("*")
      .eq("survey_id", id)
      .order("order_index");

    if (questionsError) {
      toast.error("Failed to load questions");
      return;
    }

    setQuestions(questionsData || []);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    // Check if submission is suspiciously fast (less than 10 seconds)
    const isSuspicious = timeTaken < 10;

    const { error } = await supabase.from("survey_responses").insert({
      survey_id: id!,
      user_id: user!.id,
      answers,
      time_taken_seconds: timeTaken,
      is_flagged: isSuspicious,
      flag_reason: isSuspicious ? "Suspiciously fast completion" : null,
    });

    if (error) {
      toast.error("Failed to submit survey");
      setSubmitting(false);
      return;
    }

    toast.success(isSuspicious ? "Survey submitted for review" : "Survey completed!");
    navigate("/surveys");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!survey) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/surveys")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-secondary">{survey.title}</h1>
                <p className="text-sm text-muted-foreground">Reward: Ksh {survey.reward_amount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <Clock className="h-5 w-5" />
              <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-6">
          {questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {index + 1}. {question.question_text}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {question.question_type === "mcq" && (
                  <RadioGroup
                    value={answers[question.id]}
                    onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
                  >
                    {question.options?.map((option, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${question.id}-${i}`} />
                        <Label htmlFor={`${question.id}-${i}`}>{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {question.question_type === "checkbox" && (
                  <div className="space-y-2">
                    {question.options?.map((option, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${question.id}-${i}`}
                          checked={answers[question.id]?.includes(option)}
                          onCheckedChange={(checked) => {
                            const current = answers[question.id] || [];
                            if (checked) {
                              setAnswers({ ...answers, [question.id]: [...current, option] });
                            } else {
                              setAnswers({
                                ...answers,
                                [question.id]: current.filter((o: string) => o !== option),
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`${question.id}-${i}`}>{option}</Label>
                      </div>
                    ))}
                  </div>
                )}

                {question.question_type === "text" && (
                  <Textarea
                    value={answers[question.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                    placeholder="Type your answer here..."
                    rows={4}
                  />
                )}

                {(question.question_type === "rating" || question.question_type === "likert") && (
                  <RadioGroup
                    value={answers[question.id]}
                    onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
                  >
                    {question.options?.map((option, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${question.id}-${i}`} />
                        <Label htmlFor={`${question.id}-${i}`}>{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Survey"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default TakeSurvey;
