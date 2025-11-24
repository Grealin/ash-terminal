import { AppConfig } from '@shared/models'

export class ContextService {
    static async getConfig(): Promise<AppConfig> {
        return window.context.getConfig()
    }

    static async saveConfig(config: AppConfig): Promise<void> {
        return window.context.saveConfig(config)
    }

    static async updateConfigField(path: string, value: any): Promise<void> {
        return window.context.updateConfigField(path, value)
    }
}
