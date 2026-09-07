import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRandomAvatar(gender: 'Nam' | 'Nữ' | null): string {
  if (gender === 'Nam') {
    const boys = ['/avatars/boy.jpg', '/avatars/boy2.jpg', '/avatars/boy3.jpg', '/avatars/boy4.jpg']
    return boys[Math.floor(Math.random() * boys.length)]
  } else if (gender === 'Nữ') {
    const girls = ['/avatars/girl.jpg', '/avatars/girl2.jpg', '/avatars/girl3.jpg', '/avatars/girl4.jpg']
    return girls[Math.floor(Math.random() * girls.length)]
  }
  return '/avatars/boy.jpg'
}
