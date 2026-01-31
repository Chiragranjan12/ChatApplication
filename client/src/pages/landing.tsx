import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Zap, Globe, MessageCircle } from 'lucide-react';
import { SafetyGuard } from '@/components/safety-guard';

export default function LandingPage() {
  const [showGuidelines, setShowGuidelines] = React.useState(false);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <SafetyGuard openOverride={showGuidelines} onOpenChange={setShowGuidelines} />
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-display font-bold">Nexus Chat</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth">
            <Button variant="ghost" className="font-medium">Log in</Button>
          </Link>
          <Link href="/auth">
            <Button className="rounded-full px-6 shadow-lg shadow-primary/25">Get Started</Button>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 px-6 pt-16 pb-24 md:pt-24 md:pb-32 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
        <div className="flex-1 space-y-8 text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-[1.1] tracking-tight mb-6">
              Connect <span className="text-gradient">instantly</span> with the world.
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto md:mx-0">
              Experience real-time communication reimagined. Public channels, private secure rooms, and spontaneous anonymous connections in one beautiful interface.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start"
          >
            <Link href="/auth">
              <Button size="lg" className="h-14 px-8 rounded-full text-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all">
                Start Chatting Now <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg" 
              className="h-14 px-8 rounded-full text-lg bg-white/50 backdrop-blur-sm"
              onClick={() => setShowGuidelines(true)}
            >
              View Community Guidelines
            </Button>
          </motion.div>

          <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <Feature icon={<Globe className="w-5 h-5 text-blue-500" />} title="Public Channels" desc="Join global conversations instantly." />
            <Feature icon={<Shield className="w-5 h-5 text-emerald-500" />} title="Private & Secure" desc="Encrypted private rooms for teams." />
            <Feature icon={<Zap className="w-5 h-5 text-amber-500" />} title="Real-time" desc="Zero latency messaging sync." />
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex-1 w-full max-w-[600px]"
        >
          <div className="relative aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/20">
             <img 
               src="/hero-chat.png" 
               alt="App Interface" 
               className="object-cover w-full h-full"
             />
             
             {/* Floating UI Elements for effect */}
             <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute bottom-8 left-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-2xl shadow-lg border border-white/20 max-w-[260px]"
             >
               <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">A</div>
                 <div className="text-sm font-semibold">Anonymous User</div>
               </div>
               <p className="text-sm text-muted-foreground">Is anyone else working on the new React implementation?</p>
             </motion.div>

             <motion.div 
               animate={{ y: [0, 15, 0] }}
               transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
               className="absolute top-12 right-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-2xl shadow-lg border border-white/20 max-w-[260px]"
             >
               <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold text-xs">S</div>
                 <div className="text-sm font-semibold">Sarah Chen</div>
               </div>
               <p className="text-sm text-muted-foreground">Just pushed the updates to production! 🚀</p>
             </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-background shadow-sm flex items-center justify-center mb-1">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
