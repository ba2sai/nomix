import { Global, Module } from '@nestjs/common';
import { FieldCrypto } from './field-crypto.js';
import { loadEnv } from '../config/env.js';

@Global()
@Module({
  providers: [
    {
      provide: FieldCrypto,
      useFactory: (): FieldCrypto => new FieldCrypto(loadEnv().FIELD_ENCRYPTION_KEY),
    },
  ],
  exports: [FieldCrypto],
})
export class CryptoModule {}
