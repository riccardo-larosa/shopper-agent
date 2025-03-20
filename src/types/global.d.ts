import { ShopperState } from './shopper-schemas'

declare global {
  var lastShopperState: ShopperState
}

export {} // Ensure this file is treated as a module.
