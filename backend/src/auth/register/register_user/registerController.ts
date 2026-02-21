import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { RegisterService } from './registerService';
import { RegisterDto } from './dto/register.dto';

@Controller('auth/register')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  // Recibe datos de registro desde el frontend y retorna JWT + datos de usuario.
  @Post()
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async register(@Body() dto: RegisterDto) {
    return this.registerService.register(dto);
  }
}
