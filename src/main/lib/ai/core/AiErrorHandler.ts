import OpenAI from 'openai'
import { AiErrorType, AiErrorSeverity, AiTaskError } from '@shared/models/AiError'
import type { AiProviderConfig } from '@shared/models'

/**
 * 基础错误信息（不包含 provider 上下文）
 */
function buildBaseError(
  type: AiErrorType,
  severity: AiErrorSeverity,
  title: string,
  message: string,
  suggestion: string,
  extra?: {
    statusCode?: number
    code?: string | null
    suggestNavigateToSettings?: boolean
  }
): Omit<AiTaskError, 'providerName' | 'baseUrl' | 'model'> {
  return {
    type,
    severity,
    title,
    message,
    suggestion,
    statusCode: extra?.statusCode,
    code: extra?.code,
    suggestNavigateToSettings: extra?.suggestNavigateToSettings
  }
}

/**
 * 附加 provider 上下文信息
 */
function attachProviderContext(
  base: Omit<AiTaskError, 'providerName' | 'baseUrl' | 'model'>,
  provider: AiProviderConfig | null
): AiTaskError {
  return {
    ...base,
    providerName: provider?.configName,
    baseUrl: provider?.baseUrl,
    model: provider?.model
  }
}

/**
 * 对 OpenAI SDK v6 抛出的错误进行分类，生成结构化的 AiTaskError
 *
 * @param error - 捕获的错误
 * @param provider - 当前激活的 provider 配置（可为 null）
 * @returns 分类后的 AiTaskError 对象
 */
export function classifyApiError(error: unknown, provider: AiProviderConfig | null): AiTaskError {
  // 1. 处理 OpenAI SDK 类型化错误
  if (error instanceof OpenAI.APIError) {
    return classifyOpenAIError(error, provider)
  }

  // 2. 处理通用 Error
  if (error instanceof Error) {
    return classifyGenericError(error, provider)
  }

  // 3. 完全未知的错误类型
  return buildUnknownError(String(error), provider)
}

/**
 * 处理 OpenAI SDK v6 类型化错误
 */
function classifyOpenAIError(
  error: Error & { status?: number; code?: string | null; headers?: Headers | undefined },
  provider: AiProviderConfig | null
): AiTaskError {
  // 401 - 认证错误
  if (error instanceof OpenAI.AuthenticationError) {
    return attachProviderContext(
      buildBaseError(
        AiErrorType.AUTHENTICATION,
        AiErrorSeverity.CONFIGURATION,
        'API 认证失败',
        error.message,
        '请检查 AI 设置中的 API Key 是否正确，确认该 Key 在对应平台有效且未过期。',
        {
          statusCode: error.status,
          code: (error as any).code,
          suggestNavigateToSettings: true
        }
      ),
      provider
    )
  }

  // 403 - 权限错误
  if (error instanceof OpenAI.PermissionDeniedError) {
    return attachProviderContext(
      buildBaseError(
        AiErrorType.PERMISSION_DENIED,
        AiErrorSeverity.CONFIGURATION,
        'API 访问被拒绝',
        error.message,
        '请检查您的账户权限，确认账户余额充足且未被禁用。',
        {
          statusCode: error.status,
          code: (error as any).code
        }
      ),
      provider
    )
  }

  // 404 - 端点不存在或模型不存在
  if (error instanceof OpenAI.NotFoundError) {
    const modelName = provider?.model
    // 检查错误消息是否与模型相关
    if (
      modelName &&
      (error.message?.includes(modelName) ||
        error.message?.toLowerCase().includes('model') ||
        error.message?.toLowerCase().includes('部署'))
    ) {
      return attachProviderContext(
        buildBaseError(
          AiErrorType.MODEL_NOT_FOUND,
          AiErrorSeverity.CONFIGURATION,
          '模型不可用',
          `模型 "${modelName}" 不可用：${error.message}`,
          '请检查 AI 设置中的模型名称是否正确，或切换到其他可用的模型。',
          {
            statusCode: error.status,
            code: (error as any).code,
            suggestNavigateToSettings: true
          }
        ),
        provider
      )
    }

    return attachProviderContext(
      buildBaseError(
        AiErrorType.NOT_FOUND,
        AiErrorSeverity.CONFIGURATION,
        'API 端点不存在',
        error.message,
        '请检查 Base URL 配置是否正确，确认 API 地址可访问。',
        {
          statusCode: error.status,
          code: (error as any).code,
          suggestNavigateToSettings: true
        }
      ),
      provider
    )
  }

  // 429 - 频率限制
  if (error instanceof OpenAI.RateLimitError) {
    return attachProviderContext(
      buildBaseError(
        AiErrorType.RATE_LIMIT,
        AiErrorSeverity.TRANSIENT,
        '请求频率超限',
        error.message,
        '请稍后重试（建议等待 30-60 秒），或切换到其他可用的 API 提供商。',
        {
          statusCode: error.status,
          code: (error as any).code
        }
      ),
      provider
    )
  }

  // 400 - 请求参数错误
  if (error instanceof OpenAI.BadRequestError) {
    return attachProviderContext(
      buildBaseError(
        AiErrorType.INVALID_REQUEST,
        AiErrorSeverity.CONFIGURATION,
        '请求参数错误',
        error.message,
        '可能是模型不支持某些参数，请检查模型配置或切换到其他模型。',
        {
          statusCode: error.status,
          code: (error as any).code,
          suggestNavigateToSettings: true
        }
      ),
      provider
    )
  }

  // 5xx - 服务端错误
  if (error instanceof OpenAI.InternalServerError) {
    return attachProviderContext(
      buildBaseError(
        AiErrorType.SERVER_ERROR,
        AiErrorSeverity.TRANSIENT,
        'API 服务器错误',
        error.message,
        '服务端暂时不可用，请稍后重试或检查服务商状态页面。',
        {
          statusCode: error.status,
          code: (error as any).code
        }
      ),
      provider
    )
  }

  // 其他 API 错误（按 HTTP 状态码分类）
  return classifyByStatusCode(error, provider)
}

/**
 * 按 HTTP 状态码分类未知的 API 错误
 */
function classifyByStatusCode(
  error: Error & { status?: number; code?: string | null; headers?: Headers | undefined },
  provider: AiProviderConfig | null
): AiTaskError {
  const status = error.status

  if (status === 401) {
    return attachProviderContext(
      buildBaseError(
        AiErrorType.AUTHENTICATION,
        AiErrorSeverity.CONFIGURATION,
        'API 认证失败',
        error.message,
        '请检查 AI 设置中的 API Key 是否正确，确认该 Key 在对应平台有效且未过期。',
        {
          statusCode: status,
          code: (error as any).code,
          suggestNavigateToSettings: true
        }
      ),
      provider
    )
  }

  if (status === 403) {
    return attachProviderContext(
      buildBaseError(
        AiErrorType.PERMISSION_DENIED,
        AiErrorSeverity.CONFIGURATION,
        'API 访问被拒绝',
        error.message,
        '请检查您的账户权限，确认账户余额充足且未被禁用。',
        {
          statusCode: status,
          code: (error as any).code
        }
      ),
      provider
    )
  }

  if (status === 404) {
    return attachProviderContext(
      buildBaseError(
        AiErrorType.NOT_FOUND,
        AiErrorSeverity.CONFIGURATION,
        'API 端点不存在',
        error.message,
        '请检查 Base URL 配置是否正确。',
        {
          statusCode: status,
          code: (error as any).code,
          suggestNavigateToSettings: true
        }
      ),
      provider
    )
  }

  if (status === 429) {
    return attachProviderContext(
      buildBaseError(
        AiErrorType.RATE_LIMIT,
        AiErrorSeverity.TRANSIENT,
        '请求频率超限',
        error.message,
        '请稍后重试（建议等待 30-60 秒）。',
        {
          statusCode: status,
          code: (error as any).code
        }
      ),
      provider
    )
  }

  if (status !== undefined && status >= 500) {
    return attachProviderContext(
      buildBaseError(
        AiErrorType.SERVER_ERROR,
        AiErrorSeverity.TRANSIENT,
        'API 服务器错误',
        error.message,
        '服务端暂时不可用，请稍后重试或检查服务商状态页面。',
        {
          statusCode: status,
          code: (error as any).code
        }
      ),
      provider
    )
  }

  // 其他 HTTP 状态码
  return attachProviderContext(
    buildBaseError(
      AiErrorType.UNKNOWN,
      AiErrorSeverity.UNKNOWN,
      'API 请求失败',
      `服务器返回 ${status}：${error.message}`,
      '请查看错误详情，如问题持续请联系开发者。',
      {
        statusCode: status,
        code: (error as any).code
      }
    ),
    provider
  )
}

/**
 * 处理通用的非 SDK Error
 */
function classifyGenericError(error: Error, provider: AiProviderConfig | null): AiTaskError {
  const msg = error.message || ''

  // 用户中止
  if (
    error.name === 'AbortError' ||
    msg.includes('Request was aborted') ||
    msg.includes('aborted')
  ) {
    return attachProviderContext(
      buildBaseError(
        AiErrorType.USER_ABORT,
        AiErrorSeverity.CANCELLED,
        '请求已取消',
        '已中止正在进行的请求。',
        ''
      ),
      provider
    )
  }

  // 超时
  if (
    msg.includes('timeout') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('Timed out') ||
    msg.includes('timed out')
  ) {
    return attachProviderContext(
      buildBaseError(
        AiErrorType.TIMEOUT,
        AiErrorSeverity.TRANSIENT,
        'API 请求超时',
        `请求在等待响应时超时：${error.message}`,
        '请检查网络连接或稍后重试。如果问题持续，请检查 Base URL 是否可访问。',
        {
          suggestNavigateToSettings: true
        }
      ),
      provider
    )
  }

  // 网络连接错误
  if (
    msg.includes('ECONNREFUSED') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('fetch failed') ||
    msg.includes('Failed to fetch') ||
    msg.includes('Connection error') ||
    msg.includes('network error')
  ) {
    return attachProviderContext(
      buildBaseError(
        AiErrorType.CONNECTION_ERROR,
        AiErrorSeverity.CONFIGURATION,
        '无法连接到 API 服务器',
        `网络连接失败：${error.message}`,
        '请检查 Base URL 配置是否正确、网络是否通畅。确认 API 地址格式正确且可访问。',
        {
          suggestNavigateToSettings: true
        }
      ),
      provider
    )
  }

  // API Key 相关通用错误
  if (
    msg.includes('API Key') ||
    msg.includes('apiKey') ||
    msg.includes('api_key') ||
    msg.includes('apikey')
  ) {
    return attachProviderContext(
      buildBaseError(
        AiErrorType.AUTHENTICATION,
        AiErrorSeverity.CONFIGURATION,
        'API 配置错误',
        error.message,
        '请检查 AI 设置中的 API Key 是否正确配置。',
        {
          suggestNavigateToSettings: true
        }
      ),
      provider
    )
  }

  // 配置相关错误
  if (
    msg.includes('未配置') ||
    msg.includes('not found') ||
    msg.includes('not configured') ||
    msg.includes('未找到')
  ) {
    return attachProviderContext(
      buildBaseError(
        AiErrorType.UNKNOWN,
        AiErrorSeverity.CONFIGURATION,
        '配置错误',
        error.message,
        '请检查 AI 设置，确保所有必要字段已正确填写。',
        {
          suggestNavigateToSettings: true
        }
      ),
      provider
    )
  }

  // 其他未知错误
  return buildUnknownError(error.message, provider)
}

/**
 * 构造"用户手动停止"的结构化错误
 * 用于 Agent 循环中检测到 isRunning 标志变为 false 时
 * 与 AbortError 触发的 USER_ABORT 不同，这是主动检测标志产生的
 */
export function createUserStopError(provider: AiProviderConfig | null): AiTaskError {
  return attachProviderContext(
    buildBaseError(
      AiErrorType.USER_ABORT,
      AiErrorSeverity.CANCELLED,
      '任务已停止',
      'Agent 已被手动停止。',
      ''
    ),
    provider
  )
}

/**
 * 构建未知错误的回退对象
 */
function buildUnknownError(message: string, provider: AiProviderConfig | null): AiTaskError {
  return attachProviderContext(
    buildBaseError(
      AiErrorType.UNKNOWN,
      AiErrorSeverity.UNKNOWN,
      '处理请求时出错',
      message || '发生未知错误',
      '请查看错误详情，如问题持续请联系开发者。'
    ),
    provider
  )
}
