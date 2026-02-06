"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  LayoutGrid,
  Database,
  Lock,
  Layers,
  Terminal,
  FileCode2,
} from "lucide-react";

const About = () => {
  const features = [
    {
      icon: <LayoutGrid className="w-6 h-6" />,
      title: "33+ UI Components",
      description:
        "Pre-built shadcn/ui components including buttons, cards, dialogs, tables, charts, and more.",
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Authentication Ready",
      description:
        "Complete auth system with login, logout, session management, and route guards.",
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: "PocketBase Integration",
      description:
        "Backend-ready with PocketBase SDK configured for data management and API calls.",
    },
    {
      icon: <Layers className="w-6 h-6" />,
      title: "Dark Mode Support",
      description:
        "Built-in theme system with next-themes for seamless light/dark mode switching.",
    },
    {
      icon: <Terminal className="w-6 h-6" />,
      title: "Developer Experience",
      description:
        "ESLint, Husky pre-commit hooks, and organized folder structure for clean code.",
    },
    {
      icon: <FileCode2 className="w-6 h-6" />,
      title: "Form Handling",
      description:
        "React Hook Form with Yup validation for robust and type-safe form management.",
    },
  ];

  const techStack = [
    { name: "Next.js 16", category: "Framework" },
    { name: "React 19", category: "Library" },
    { name: "Tailwind 4", category: "Styling" },
    { name: "Framer Motion", category: "Animation" },
    { name: "shadcn/ui", category: "Components" },
    { name: "PocketBase", category: "Backend" },
  ];

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <>
      {/* Features Section */}
      <section className="py-24 border-t border-border">
        <div className="container mx-auto px-6">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
              Features
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything you need to ship
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              A comprehensive boilerplate with all the essential features
              pre-configured and ready to use.
            </p>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="group p-6 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all duration-300"
              >
                <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-24 border-t border-border bg-accent/30">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
              Tech Stack
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Built with modern tools
            </h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto"
          >
            {techStack.map((tech, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="px-6 py-3 rounded-full border border-border bg-background hover:bg-accent transition-colors"
              >
                <span className="font-medium">{tech.name}</span>
                <span className="text-muted-foreground text-sm ml-2">
                  {tech.category}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Quick Start Section */}
      <section className="py-24 border-t border-border">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto text-center"
          >
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
              Quick Start
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8">
              Get up and running in minutes
            </h2>

            {/* Code Block */}
            <div className="text-left bg-primary text-primary-foreground rounded-xl p-6 font-mono text-sm overflow-x-auto">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-primary-foreground/20">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-2 text-primary-foreground/60">
                  terminal
                </span>
              </div>
              <p className="text-primary-foreground/60">
                # Clone the repository
              </p>
              <p className="mb-3">
                <span className="text-green-400">$</span> git clone
                https://github.com/your-repo/nextjs-boilerplate.git
              </p>
              <p className="text-primary-foreground/60">
                # Install dependencies
              </p>
              <p className="mb-3">
                <span className="text-green-400">$</span> npm install
              </p>
              <p className="text-primary-foreground/60">
                # Start development server
              </p>
              <p>
                <span className="text-green-400">$</span> npm run dev
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default About;
