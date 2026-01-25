import { SSH2Wrapper } from './SSH2Wrapper'

export const resolveTildePath = async (ssh: SSH2Wrapper, p: string): Promise<string> => {
  if (!p.includes('~')) return p

  try {
    const homeResult = await ssh.execCommand('echo ~')
    if (homeResult.stdout && !homeResult.stderr) {
      const homePath = homeResult.stdout.trim()
      return p.replace(/^~/, homePath)
    } else {
      throw new Error('Failed to get home directory using echo ~')
    }
  } catch {
    try {
      const homeResult = await ssh.execCommand('echo $HOME')
      if (homeResult.stdout && !homeResult.stderr) {
        const homePath = homeResult.stdout.trim()
        return p.replace(/^~/, homePath)
      } else {
        throw new Error('Failed to get home directory using $HOME')
      }
    } catch {
      try {
        const whoamiResult = await ssh.execCommand('whoami')
        if (whoamiResult.stdout && !whoamiResult.stderr) {
          const username = whoamiResult.stdout.trim()
          return p.replace(/^~/, `/home/${username}`)
        }
        throw new Error('Failed to get username')
      } catch (usernameError) {
        throw new Error(`Unable to resolve path with ~: ${usernameError}`)
      }
    }
  }
}
