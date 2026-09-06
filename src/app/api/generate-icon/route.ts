import { NextRequest } from 'next/server'
import { handle, ok, fail } from '@/lib/api'

/**
 * POST /api/generate-icon
 * Gọi API Nano Banana (hoặc AI tạo ảnh) để tạo icon cho loại vi phạm.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const { name } = await req.json()
    if (!name) return fail(400, 'Thiếu tên vi phạm')

    // Sử dụng Pollinations.ai - Một API miễn phí, không cần key để tạo ảnh bằng AI (Dùng model Flux).
    const aiPrompt = `A cute minimalist 3D icon representing "${name}". White clean background, bright blue and red accents. Isometric view, soft studio lighting, highly detailed.`
    const encodedPrompt = encodeURIComponent(aiPrompt)
    
    // Tạo seed ngẫu nhiên để nếu người dùng tạo lại cùng 1 vi phạm sẽ ra ảnh khác
    const randomSeed = Math.floor(Math.random() * 1000000)
    
    // URL trực tiếp trả về file ảnh (nologo=true để bỏ watermark)
    const iconUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=256&height=256&nologo=true&seed=${randomSeed}`

    // Đợi 1 chút để tạo cảm giác AI đang vẽ (và cho UI hiện loading)
    await new Promise(r => setTimeout(r, 1500))

    return ok({ iconUrl })
  })
}
