import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CryptoModule } from './crypto/crypto.module.js';
import { AuditoriaModule } from './auditoria/auditoria.module.js';
import { HealthController } from './health/health.controller.js';
import { EmpresaController } from './empresa/empresa.controller.js';
import { PlanillaController } from './planilla/planilla.controller.js';
import { PlanillaService } from './planilla/planilla.service.js';
import { ProcesoService } from './planilla/proceso.service.js';
import { MovimientoService } from './planilla/movimiento.service.js';
import { ColaboradorController } from './colaborador/colaborador.controller.js';
import { ColaboradorService } from './colaborador/colaborador.service.js';
import { ConceptoFijoService } from './colaborador/concepto-fijo.service.js';
import { DocumentoService } from './colaborador/documento.service.js';
import { ConceptoController } from './concepto/concepto.controller.js';
import { ConceptoService } from './concepto/concepto.service.js';

@Module({
  imports: [DbModule, AuthModule, CryptoModule, AuditoriaModule],
  controllers: [
    HealthController,
    EmpresaController,
    PlanillaController,
    ColaboradorController,
    ConceptoController,
  ],
  providers: [
    PlanillaService,
    ProcesoService,
    MovimientoService,
    ColaboradorService,
    ConceptoFijoService,
    DocumentoService,
    ConceptoService,
  ],
})
export class AppModule {}
