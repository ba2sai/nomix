import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health/health.controller.js';
import { EmpresaController } from './empresa/empresa.controller.js';

@Module({
  imports: [DbModule, AuthModule],
  controllers: [HealthController, EmpresaController],
})
export class AppModule {}
