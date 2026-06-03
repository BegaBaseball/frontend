"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";
import { useTheme } from "../../hooks/useTheme";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      {...props}
    />
  );
};

export { Toaster };
