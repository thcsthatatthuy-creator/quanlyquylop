import { InferenceClient } from "@huggingface/inference"
import fs from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

// Khởi tạo client Hugging Face với token từ .env
const hf = new InferenceClient(process.env.HF_TOKEN)

export async function generateViolationIcon(name: string): Promise<string> {
  // Bước 1: Dịch tên vi phạm sang mô tả tiếng Anh để AI vẽ hình hiểu chính xác
  let englishConcept = name
  try {
    const chatRes = await hf.chatCompletion({
      model: "meta-llama/Meta-Llama-3-8B-Instruct",
      messages: [
        { 
          role: "user", 
          content: `Translate this Vietnamese school violation into a very short English phrase describing the action (e.g. "sleeping in class", "using smartphone", "fighting", "late for school"). Only output the short English phrase, nothing else. The phrase is: "${name}"` 
        }
      ],
      max_tokens: 15,
    })
    if (chatRes.choices && chatRes.choices[0].message?.content) {
      englishConcept = chatRes.choices[0].message.content.trim().replace(/['"]/g, '')
    }
  } catch (err) {
    console.error('Translation failed, using original name', err)
  }

  // Yêu cầu: Phong cách 2D vector clipart, giống hình vẽ sticker dễ thương, nền trắng tinh tuyệt đối
  const prompt = `A high quality, colorful 2D vector clipart illustration representing a student: ${englishConcept}. Cute cartoon sticker style, flat colors, expressive, clear outlines, isolated on a pure solid white background, no background elements, simple and iconic.`
  
  // Sử dụng model FLUX.1-schnell của Black Forest Labs (rất thông minh và chất lượng cao)
  const blob = await hf.textToImage({
    model: "black-forest-labs/FLUX.1-schnell",
    inputs: prompt,
  })

  // Đọc dữ liệu ảnh từ Blob
  const arrayBuffer = await blob.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  // Lưu ảnh vào thư mục public/violations để frontend hiển thị được ngay lập tức
  const filename = `icon-${Date.now()}-${randomBytes(4).toString('hex')}.jpg`
  const dirPath = path.join(process.cwd(), 'public', 'violations')
  
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch (e) {
    // Bỏ qua lỗi nếu thư mục đã tồn tại
  }
  
  await fs.writeFile(path.join(dirPath, filename), buffer)
  
  // Trả về đường dẫn ảnh hợp lệ cho web
  return `/violations/${filename}`
}
