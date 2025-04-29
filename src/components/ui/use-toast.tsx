"use client"

import { toast as sonnerToast, type ToastT } from "sonner"

export type ToastProps = ToastT & { 
  title?: string 
  description?: string
  variant?: "default" | "destructive" | "success"
}

export function toast(props: ToastProps) {
  const { title, description, variant, ...rest } = props
  
  const options: Record<string, any> = {
    ...rest
  }
  
  if (variant === "destructive") {
    options.className = "destructive"
  } else if (variant === "success") {
    options.className = "success"
  }
  
  if (title && description) {
    return sonnerToast(
      title,
      {
        description,
        ...options
      }
    )
  }
  
  return sonnerToast(description || title || "", options)
} 