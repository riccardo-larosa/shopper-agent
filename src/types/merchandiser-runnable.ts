import { BaseCallbackConfig } from '@langchain/core/callbacks/manager'
import { EpAuthentication } from './ep-auth'

/**
 * This represents the expected configurable type for the Merchandiser Agent
 */
export interface MerchandiserRunnableConfigurable
  extends BaseCallbackConfig,
    Record<string, any> {
  epAuthentication: EpAuthentication
  epBaseUrl?: string
}
