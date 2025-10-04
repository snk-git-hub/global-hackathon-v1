import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const CTA = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gradient-to-br from-primary via-primary to-accent relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      
      <div className="container mx-auto px-4 relative">
        <div className="max-w-3xl mx-auto text-center text-primary-foreground">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to start creating?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of teams already using DrawSync to collaborate better.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="text-lg px-8"
            onClick={() => navigate("/auth")}
          >
            Get Started Free
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};
