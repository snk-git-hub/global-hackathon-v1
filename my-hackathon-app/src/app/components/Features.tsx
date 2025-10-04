import { Users, Zap, Lock, Palette } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Users,
    title: "Real-time Collaboration",
    description: "Work together seamlessly with your team. See changes instantly as they happen.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Built for speed. No lag, no delays - just smooth, responsive drawing.",
  },
  {
    icon: Lock,
    title: "Secure & Private",
    description: "Your data is encrypted and secure. Create private rooms for your team.",
  },
  {
    icon: Palette,
    title: "Powerful Tools",
    description: "From simple sketches to complex diagrams - all the tools you need.",
  },
];

export const Features = () => {
  return (
    <section className="py-20 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything you need to collaborate
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features that make remote collaboration feel natural
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="border-2 hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
