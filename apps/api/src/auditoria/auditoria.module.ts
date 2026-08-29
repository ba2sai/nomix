import { Global, Module } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service.js';
import { AuditoriaController } from './auditoria.controller.js';

/**
 * Global porque el guard de permisos —que vive en `auth`— deja rastro en cada
 * petición sensible (`ADR-019`). Hacerlo global evita que cada módulo de
 * dominio tenga que acordarse de importar la bitácora para quedar auditado.
 */
@Global()
@Module({
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
