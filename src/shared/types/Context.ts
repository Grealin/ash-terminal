import { AppConfig } from '../models'

export type GetConfig = () => Promise<AppConfig>
export type SaveConfig = (config: AppConfig) => Promise<void>
export type UpdateConfigField = (path: string, value: any) => Promise<void>
