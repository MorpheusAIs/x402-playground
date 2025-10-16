import { Effect } from "effect";
import { env } from "@/lib/env";
import {
  getOrCreatePurchaserAccount,
  getOrCreateSellerAccount,
} from "@/lib/accounts";

export const getEnvEffect = Effect.succeed(env);

export const getSellerAccountEffect = Effect.promise(() =>
  getOrCreateSellerAccount()
);

export const getPurchaserAccountEffect = Effect.promise(() =>
  getOrCreatePurchaserAccount()
);






