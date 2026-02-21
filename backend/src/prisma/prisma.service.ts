import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Conecta cuando el módulo se inicializa para asegurar acceso a la DB.
  async onModuleInit() {
    await this.$connect();
  }

  // Cierra la conexión a la DB de forma limpia al apagar.
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
