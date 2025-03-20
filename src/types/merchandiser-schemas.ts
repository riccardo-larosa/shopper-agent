import { EpKeysAuthentication, EpTokenAuthentication } from './ep-auth'
import { Annotation, MessagesAnnotation } from '@langchain/langgraph'

export const MerchandiserStateSchema = Annotation.Root({
  ...MessagesAnnotation.spec
  // add any additional state you need
})

/**
 * This represents the expected configurable type for the Merchandiser Agent
 */
export const MerchandiserConfigSchema = Annotation.Root({
  epKeyAuthentication: Annotation<EpKeysAuthentication>,
  epTokenAuthentication: Annotation<EpTokenAuthentication>,
  epBaseUrl: Annotation<string | undefined>
})

export type MerchandiserConfig = typeof MerchandiserConfigSchema.State
export type MerchandiserState = typeof MerchandiserStateSchema.State
