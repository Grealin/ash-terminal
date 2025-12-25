// 获取随机uuid
import { v4 as uuidv4 } from 'uuid'

/**
 * 生成唯一标识符
 * @returns 唯一标识符字符串
 */
export function generateUniqueId(): string {
  return uuidv4()
}
