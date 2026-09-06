"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-xl font-semibold shadow-sm px-4 py-3 border flex items-center gap-2",
          // Thành công / Thông thường -> Màu xanh pastel (giống ảnh)
          default:
            "group-[.toaster]:bg-[#F0F8FF] group-[.toaster]:text-[#0066CC] group-[.toaster]:border-blue-100",
          success:
            "group-[.toaster]:bg-[#F0F8FF] group-[.toaster]:text-[#0066CC] group-[.toaster]:border-blue-100",
          info:
            "group-[.toaster]:bg-[#F0F8FF] group-[.toaster]:text-[#0066CC] group-[.toaster]:border-blue-100",
          // Lỗi -> Màu đỏ pastel
          error:
            "group-[.toaster]:bg-[#FEF2F2] group-[.toaster]:text-[#DC2626] group-[.toaster]:border-red-100",
          warning:
            "group-[.toaster]:bg-[#FFFBEB] group-[.toaster]:text-[#D97706] group-[.toaster]:border-amber-100",
          description: "group-[.toast]:opacity-80 font-normal text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
