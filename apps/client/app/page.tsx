"use client"
import { AuthGuard } from "@/components/landing/Auth/AuthGuard"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  Target,
  DollarSign,
  Globe,
  Star,
  ArrowRight,
  Play,
  Users,
  Award,
  CheckCircle,
  Menu,
  X,
} from "lucide-react"

export default function PredictionTradingLanding() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentPrice, setCurrentPrice] = useState(0.67)
  const [tradedAmount, setTradedAmount] = useState(10000000)
  const [activeTraders, setActiveTraders] = useState(50000)

  // Animate numbers on mount
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice((prev) => prev + (Math.random() - 0.5) * 0.02)
      setTradedAmount((prev) => prev + Math.floor(Math.random() * 1000))
      setActiveTraders((prev) => prev + Math.floor(Math.random() * 10))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // Function to handle redirect to sign-in
  const handleSignInRedirect = () => {
    window.location.href = '/auth/signin'
  }

  const features = [
    {
      icon: Shield,
      title: "Secure Trading",
      description: "Bank-level security with advanced encryption",
      gradient: "from-emerald-500 to-green-600",
    },
    {
      icon: Zap,
      title: "Instant Payouts",
      description: "Withdraw winnings immediately to your account",
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      icon: BarChart3,
      title: "Real-Time Data",
      description: "Live market updates and price movements",
      gradient: "from-violet-500 to-purple-600",
    },
    {
      icon: Target,
      title: "Expert Analysis",
      description: "Professional insights and market predictions",
      gradient: "from-red-500 to-rose-600",
    },
    {
      icon: DollarSign,
      title: "Low Fees",
      description: "Keep more of your winnings with minimal fees",
      gradient: "from-emerald-500 to-green-600",
    },
    {
      icon: Globe,
      title: "Global Markets",
      description: "Trade on worldwide events and predictions",
      gradient: "from-cyan-500 to-blue-600",
    },
  ]

  const sampleMarkets = [
    {
      title: "Will Bitcoin hit ₹1.2Cr by 2025?",
      yesPrice: 0.67,
      noPrice: 0.33,
      volume: "₹2.4M",
      participants: 1247,
      trend: "up",
    },
    {
      title: "India to win Cricket World Cup 2024?",
      yesPrice: 0.45,
      noPrice: 0.55,
      volume: "₹1.8M",
      participants: 892,
      trend: "down",
    },
    {
      title: "Tesla stock above $300 by Dec 2024?",
      yesPrice: 0.72,
      noPrice: 0.28,
      volume: "₹3.1M",
      participants: 1563,
      trend: "up",
    },
    {
      title: "AI will replace 50% jobs by 2030?",
      yesPrice: 0.38,
      noPrice: 0.62,
      volume: "₹950K",
      participants: 634,
      trend: "up",
    },
  ]

  const testimonials = [
    {
      name: "Rajesh Kumar",
      role: "Day Trader",
      content: "Made ₹50K in my first month! The platform is incredibly intuitive and the payouts are instant.",
      rating: 5,
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      name: "Priya Sharma",
      role: "Investment Analyst",
      content: "Finally, a platform where my market knowledge pays off. The analysis tools are top-notch.",
      rating: 5,
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      name: "Amit Patel",
      role: "Crypto Enthusiast",
      content: "Love the crypto prediction markets. Made some great calls on Bitcoin and Ethereum movements.",
      rating: 5,
      avatar: "/placeholder.svg?height=40&width=40",
    },
  ]

  return (
    <AuthGuard requireAuth = {false}>
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-violet-500/20 to-purple-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-gradient-to-r from-emerald-500/20 to-green-600/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 px-4 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              PredictTrade
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#markets" className="text-slate-300 hover:text-white transition-colors">
              Markets
            </a>
            <a href="#how-it-works" className="text-slate-300 hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#features" className="text-slate-300 hover:text-white transition-colors">
              Features
            </a>
            <Button 
              variant="outline" 
              className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
              onClick={handleSignInRedirect}
            >
              Sign In
            </Button>
            <Button 
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              onClick={handleSignInRedirect}
            >
              Start Trading
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700 p-4">
            <div className="flex flex-col space-y-4">
              <a href="#markets" className="text-slate-300 hover:text-white transition-colors">
                Markets
              </a>
              <a href="#how-it-works" className="text-slate-300 hover:text-white transition-colors">
                How It Works
              </a>
              <a href="#features" className="text-slate-300 hover:text-white transition-colors">
                Features
              </a>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 w-full bg-transparent"
                onClick={handleSignInRedirect}
              >
                Sign In
              </Button>
              <Button 
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 w-full"
                onClick={handleSignInRedirect}
              >
                Start Trading
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-4 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent leading-tight">
              Trade Your Opinions,
              <br />
              Shape the Future
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Make money from your predictions on real-world events. Turn your market insights into profits with our
              cutting-edge prediction trading platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-lg px-8 py-4 h-auto"
                onClick={handleSignInRedirect}
              >
                Start Trading Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                  ₹{(tradedAmount / 10000000).toFixed(1)}M+
                </div>
                <div className="text-slate-400">Total Traded</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  {(activeTraders / 1000).toFixed(0)}K+
                </div>
                <div className="text-slate-400">Active Traders</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                  95%
                </div>
                <div className="text-slate-400">Accuracy Rate</div>
              </div>
            </div>
          </div>

          {/* Hero Trading Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {sampleMarkets.slice(0, 3).map((market, index) => (
              <Card
                key={index}
                className="bg-slate-900/50 backdrop-blur-lg border-slate-700 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20 group cursor-pointer"
                onClick={handleSignInRedirect}
              >
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 text-white group-hover:text-cyan-300 transition-colors">
                    {market.title}
                  </h3>
                  <div className="flex justify-between mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-400">₹{market.yesPrice.toFixed(2)}</div>
                      <div className="text-sm text-slate-400">YES</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">₹{market.noPrice.toFixed(2)}</div>
                      <div className="text-sm text-slate-400">NO</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Volume: {market.volume}</span>
                    <span>{market.participants} traders</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 px-4 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              How It Works
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Start earning from your predictions in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Target className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Pick an Event</h3>
              <p className="text-slate-300">
                Choose from hundreds of real-world predictions across sports, politics, crypto, and technology.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Buy YES/NO</h3>
              <p className="text-slate-300">
                Trade contracts based on your opinion. Buy YES if you think it will happen, NO if you don't.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Earn Rewards</h3>
              <p className="text-slate-300">
                Get paid when you're right. Withdraw your winnings instantly to your bank account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Markets Preview */}
      <section id="markets" className="relative z-10 px-4 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Live Markets
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Trade on the hottest predictions with real-time pricing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {sampleMarkets.map((market, index) => (
              <Card
                key={index}
                className="bg-slate-900/50 backdrop-blur-lg border-slate-700 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20 group cursor-pointer"
                onClick={handleSignInRedirect}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                      Live
                    </Badge>
                    <div
                      className={`w-2 h-2 rounded-full ${market.trend === "up" ? "bg-emerald-400" : "bg-red-400"} animate-pulse`}
                    ></div>
                  </div>

                  <h3 className="font-semibold mb-4 text-white group-hover:text-emerald-300 transition-colors text-sm">
                    {market.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <Button
                      size="sm"
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSignInRedirect()
                      }}
                    >
                      YES ₹{market.yesPrice.toFixed(2)}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSignInRedirect()
                      }}
                    >
                      NO ₹{market.noPrice.toFixed(2)}
                    </Button>
                  </div>

                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Vol: {market.volume}</span>
                    <span>
                      <Users className="w-3 h-3 inline mr-1" />
                      {market.participants}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
              onClick={handleSignInRedirect}
            >
              View All Markets
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-4 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Why Choose PredictTrade
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              The most advanced prediction trading platform with enterprise-grade security
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="bg-slate-900/50 backdrop-blur-lg border-slate-700 hover:border-slate-600 transition-all duration-300 group hover:shadow-lg hover:shadow-slate-500/20"
              >
                <CardContent className="p-8 text-center">
                  <div
                    className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-white">{feature.title}</h3>
                  <p className="text-slate-300">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="relative z-10 px-4 py-20">
        <div className="max-w-7xl mx-auto">
          {/* Trust Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex items-center justify-center space-x-3">
              <Shield className="w-8 h-8 text-emerald-400" />
              <span className="text-lg font-semibold text-white">Regulated Platform</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <CheckCircle className="w-8 h-8 text-cyan-400" />
              <span className="text-lg font-semibold text-white">₹100M+ Secured</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <Users className="w-8 h-8 text-violet-400" />
              <span className="text-lg font-semibold text-white">24/7 Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-lg border-slate-700 hover:border-cyan-500/50 transition-all duration-300">
            <CardContent className="p-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                Ready to Turn Your Opinions Into Profits?
              </h2>
              <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                Join thousands of successful traders who are already earning from their predictions. Start with ₹100 and
                get a welcome bonus!
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Input
                  placeholder="Enter your email address"
                  className="bg-slate-800/50 border-slate-600 text-white placeholder-slate-400 max-w-sm"
                />
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 px-8"
                  onClick={handleSignInRedirect}
                >
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>

              <p className="text-sm text-slate-400">
                Risk disclaimer: Trading involves risk. Only trade with money you can afford to lose. 18+ only.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  PredictTrade
                </span>
              </div>
              <p className="text-slate-400">The future of prediction trading. Turn your opinions into profits.</p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Markets
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    API
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Connect</h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Discord
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Telegram
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-slate-400">
            <p>&copy; 2024 PredictTrade. All rights reserved. Licensed and regulated.</p>
          </div>
        </div>
      </footer>
    </div>
    </AuthGuard>
  )
}