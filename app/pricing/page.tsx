import Link from "next/link"
import { ArrowLeft, Check } from "lucide-react"

export default function PricingPage() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for personal projects and testing",
      features: [
        "Up to 3 database connections",
        "Unlimited migrations",
        "Basic monitoring",
        "7-day audit logs",
        "Community support",
      ],
      cta: "Get Started",
      href: "/auth/signup",
      popular: false,
    },
    {
      name: "Pro",
      price: "$29",
      description: "For professional developers and small teams",
      features: [
        "Unlimited database connections",
        "Unlimited migrations",
        "Advanced monitoring & alerts",
        "90-day audit logs",
        "Team collaboration (up to 5 members)",
        "Priority email support",
        "Automated workflows",
        "API access",
      ],
      cta: "Start Free Trial",
      href: "/auth/signup?plan=pro",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations with advanced needs",
      features: [
        "Everything in Pro",
        "Unlimited team members",
        "Unlimited audit log retention",
        "SSO & SAML",
        "Advanced RBAC",
        "SLA guarantee",
        "Dedicated support",
        "Custom integrations",
        "On-premise deployment option",
      ],
      cta: "Contact Sales",
      href: "/contact",
      popular: false,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">DR</span>
            </div>
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">DataRoll</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            Choose the plan that's right for you
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 transition-all duration-300 ${
                plan.popular
                  ? "border-blue-500 dark:border-blue-600 shadow-2xl dark:shadow-lg dark:shadow-blue-950 scale-105 hover:shadow-3xl"
                  : "border-zinc-200 dark:border-zinc-800 hover:shadow-lg dark:hover:shadow-lg"
              } bg-white dark:bg-zinc-900`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  {plan.name}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-zinc-900 dark:text-zinc-100">
                    {plan.price}
                  </span>
                  {plan.price !== "Custom" && (
                    <span className="text-zinc-600 dark:text-zinc-400">/month</span>
                  )}
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-all ${
                  plan.popular
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>All plans include a 14-day free trial. No credit card required.</p>
        </div>
      </main>
    </div>
  )
}
