import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class RegisterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Registra un usuario normal y retorna un JWT.
  async register(dto: RegisterDto) {
    // 1) Verificar que el correo no esté en uso.
    const existing = await this.prisma.userNormal.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    // 2) Hashear la contraseña antes de guardar.
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 3) Crear usuario en la DB.
    const user = await this.prisma.userNormal.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        fullName: dto.fullName,
      },
    });

    // 4) Firmar JWT con claims básicos.
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      type: 'normal',
    });

    // 5) Retornar token + datos públicos (sin contraseña).
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt,
      },
    };
  }
}
