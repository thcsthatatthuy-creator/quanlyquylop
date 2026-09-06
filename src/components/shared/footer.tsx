import React from "react";

export function Footer() {
  return (
    <footer className="w-full border-t bg-muted/40 py-6 mt-auto">
      <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-sm text-muted-foreground flex flex-col items-center gap-1">
          <p className="font-medium text-foreground">Dự án được phát triển bởi Nhật Thiện</p>
          <p>&copy; 2026 - LazyBucket - All Rights Reserved.</p>
        </div>
        
        <div className="flex flex-col items-center gap-2 mt-2">
          <p className="text-xs text-muted-foreground">
            Cùng với sự tài trợ từ Tập đoàn Công nghiệp – Viễn thông Quân đội (Viettel)
          </p>
          <img 
            src="https://vtsmas.vn/assets/media/logos/viettel.png" 
            alt="Viettel Logo" 
            className="h-8 md:h-10 object-contain opacity-90 hover:opacity-100 transition-opacity"
          />
        </div>
      </div>
    </footer>
  );
}
