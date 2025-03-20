import { EpKeysAuthentication, EpTokenAuthentication } from './ep-auth'
import { Annotation, MessagesAnnotation } from '@langchain/langgraph'

export const ShopperStateSchema = Annotation.Root({
  ...MessagesAnnotation.spec,
  cartId: Annotation<string | undefined>,
  conversationHistory: Annotation<string[]>,
  lastActionSuccess: Annotation<boolean | undefined>
})

/**
 * This represents the expected configurable type for the Shopper Agent
 */
export const ShopperConfigSchema = Annotation.Root({
  epKeyAuthentication: Annotation<
    Omit<EpKeysAuthentication, '__clientSecret' | 'grantType'> & {
      grantType: 'implicit'
    }
  >,
  epTokenAuthentication: Annotation<EpTokenAuthentication>,
  epBaseUrl: Annotation<string | undefined>
})

export type ShopperConfig = typeof ShopperConfigSchema.State
export type ShopperState = typeof ShopperStateSchema.State
