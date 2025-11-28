declare module "sonner" {
  import * as React from "react";

  type ToastFunction = (message: string) => void;

  export const toast: ToastFunction & {
    error: ToastFunction;
    success: ToastFunction;
  };

  export interface ToasterProps {
    position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
    richColors?: boolean;
  }

  export const Toaster: React.FC<ToasterProps>;
}
