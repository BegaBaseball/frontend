"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

type Tone = "default" | "success" | "error" | "warning";

const statusToneClasses: Record<Tone, string> = {
  default: "auth-status-panel-default",
  success: "auth-status-panel-success",
  error: "auth-status-panel-error",
  warning: "auth-status-panel-warning",
};

function AuthShell({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="auth-shell" className={cn("auth-shell", className)} {...props} />;
}

function AuthStage({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="auth-stage" className={cn("auth-stage", className)} {...props} />;
}

function AuthHeroPanel({ className, ...props }: React.ComponentProps<"section">) {
  return <section data-slot="auth-hero-panel" className={cn("auth-hero-panel", className)} {...props} />;
}

function AuthFormPanel({ className, ...props }: React.ComponentProps<"section">) {
  return <section data-slot="auth-form-panel" className={cn("auth-form-panel", className)} {...props} />;
}

interface AuthHeaderProps extends Omit<React.ComponentProps<"header">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
}

function AuthHeader({
  className,
  title,
  description,
  ...props
}: AuthHeaderProps) {
  return (
    <header data-slot="auth-header" className={cn("auth-header", className)} {...props}>
      <div className="space-y-2">
        <h1 className="auth-title">{title}</h1>
        {description ? <p className="auth-description">{description}</p> : null}
      </div>
    </header>
  );
}

function AuthFieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="auth-field-group" className={cn("auth-field-group", className)} {...props} />;
}

function AuthActionGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="auth-action-group" className={cn("auth-action-group", className)} {...props} />;
}

interface AuthStatusPanelProps extends React.ComponentProps<"div"> {
  tone?: Tone;
}

function AuthStatusPanel({
  className,
  tone = "default",
  ...props
}: AuthStatusPanelProps) {
  return (
    <div
      data-slot="auth-status-panel"
      className={cn("auth-status-panel", statusToneClasses[tone], className)}
      {...props}
    />
  );
}

export {
  AuthActionGroup,
  AuthFieldGroup,
  AuthFormPanel,
  AuthHeader,
  AuthHeroPanel,
  AuthShell,
  AuthStage,
  AuthStatusPanel,
};
