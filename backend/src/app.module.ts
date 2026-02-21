import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RegisterModule } from './auth/register/register_user/registerModule';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, RegisterModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
